from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.api.auth import get_current_active_user
from app.models.user import User as UserModel
from app.models.document import Document as DBDocument
from app.services.ocr.tesseract import process_document
from app.services.memory.qdrant_client import ingest_document, client as qclient, COLLECTION_NAME
from qdrant_client.http import models as qmodels
from app.services.llm.orchestrator import parse_resume_text

router = APIRouter()

@router.get("")
async def get_documents(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    docs = db.query(DBDocument).filter(DBDocument.user_id == current_user.id).all()
    return docs

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    file_type: str = Query("document"), # "resume" or "document"
    db: Session = Depends(get_db), 
    current_user: UserModel = Depends(get_current_active_user)
):
    # Basic Quota check
    if current_user.role not in ["admin", "approved", "trial"]:
        raise HTTPException(status_code=403, detail="Account not approved for document ingestion.")
        
    try:
        content = await file.read()
        extracted_text = process_document(file.filename, content, file.content_type)
        
        parsed_data = None
        if file_type == "resume":
            try:
                parsed_data = await parse_resume_text(extracted_text)
            except Exception as pe:
                print(f"Failed to parse resume: {pe}")
        
        # Save to database
        db_doc = DBDocument(
            user_id=current_user.id,
            filename=file.filename,
            file_type=file_type,
            extracted_text=extracted_text,
            parsed_data=parsed_data
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        
        # Store in Vector DB
        ingest_document(
            user_id=current_user.id, 
            text=extracted_text, 
            source=file.filename,
            document_id=db_doc.id
        )
        
        return {
            "id": db_doc.id,
            "filename": file.filename, 
            "file_type": file_type,
            "status": "Ingested", 
            "text_length": len(extracted_text),
            "parsed_data": parsed_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process document: {str(e)}")

@router.delete("/{doc_id}")
async def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    doc = db.query(DBDocument).filter(DBDocument.id == doc_id, DBDocument.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    try:
        db.delete(doc)
        db.commit()
        
        qclient.delete(
            collection_name=COLLECTION_NAME,
            points_selector=qmodels.FilterSelector(
                filter=qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(key="user_id", match=qmodels.MatchValue(value=current_user.id)),
                        qmodels.FieldCondition(key="document_id", match=qmodels.MatchValue(value=doc_id))
                    ]
                )
            )
        )
        return {"status": "success", "message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete document: {str(e)}")

class DocumentUpdate(BaseModel):
    parsed_data: dict

@router.put("/{doc_id}")
async def update_document_data(
    doc_id: int,
    data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    doc = db.query(DBDocument).filter(DBDocument.id == doc_id, DBDocument.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    doc.parsed_data = data.parsed_data
    
    # Construct updated text to keep Qdrant vector database in sync!
    pd = data.parsed_data or {}
    formatted_text = f"""
    Candidate Name: {pd.get('name', '')}
    Email: {pd.get('email', '')}
    Phone: {pd.get('phone', '')}
    Professional Summary: {pd.get('summary', '')}
    Skills: {pd.get('skills', '')}
    Experience: {pd.get('experience', '')}
    Projects: {pd.get('projects', '')}
    Education: {pd.get('education', '')}
    """
    doc.extracted_text = formatted_text
    
    db.commit()
    db.refresh(doc)
    
    # Update vector db: delete old points and ingest new text!
    try:
        qclient.delete(
            collection_name=COLLECTION_NAME,
            points_selector=qmodels.FilterSelector(
                filter=qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(key="user_id", match=qmodels.MatchValue(value=current_user.id)),
                        qmodels.FieldCondition(key="document_id", match=qmodels.MatchValue(value=doc_id))
                    ]
                )
            )
        )
        
        ingest_document(
            user_id=current_user.id,
            text=formatted_text,
            source=doc.filename,
            document_id=doc.id
        )
    except Exception as e:
        print(f"Error updating vector db: {e}")
        
    return doc
