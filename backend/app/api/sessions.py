from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_db
from app.api.auth import get_current_active_user
from app.models.user import User as UserModel
from app.models.session import InterviewSession
from app.models.document import Document

router = APIRouter()

class SessionCreate(BaseModel):
    company: str
    job_description: Optional[str] = ""
    custom_instructions: Optional[str] = ""
    attached_doc_ids: Optional[List[int]] = []

@router.get("")
async def get_sessions(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    sessions = db.query(InterviewSession).filter(InterviewSession.user_id == current_user.id).order_by(InterviewSession.created_at.desc()).all()
    result = []
    for s in sessions:
        result.append({
            "id": s.id,
            "company": s.company,
            "job_description": s.job_description,
            "custom_instructions": s.custom_instructions,
            "created_at": s.created_at,
            "attached_documents": [{"id": d.id, "filename": d.filename, "file_type": d.file_type} for d in s.attached_documents]
        })
    return result

@router.get("/{session_id}")
async def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": session.id,
        "company": session.company,
        "job_description": session.job_description,
        "custom_instructions": session.custom_instructions,
        "created_at": session.created_at,
        "attached_documents": [{"id": d.id, "filename": d.filename, "file_type": d.file_type} for d in session.attached_documents]
    }

@router.post("")
async def create_session(
    data: SessionCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    docs = db.query(Document).filter(Document.id.in_(data.attached_doc_ids), Document.user_id == current_user.id).all()
    
    new_session = InterviewSession(
        user_id=current_user.id,
        company=data.company,
        job_description=data.job_description,
        custom_instructions=data.custom_instructions,
        attached_documents=docs
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return {
        "id": new_session.id,
        "company": new_session.company,
        "job_description": new_session.job_description,
        "custom_instructions": new_session.custom_instructions,
        "created_at": new_session.created_at,
        "attached_documents": [{"id": d.id, "filename": d.filename} for d in new_session.attached_documents]
    }

@router.delete("/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    try:
        db.delete(session)
        db.commit()
        
        from app.services.memory.qdrant_client import client as qclient, COLLECTION_NAME
        from qdrant_client.http import models as qmodels
        qclient.delete(
            collection_name=COLLECTION_NAME,
            points_selector=qmodels.FilterSelector(
                filter=qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(key="user_id", match=qmodels.MatchValue(value=current_user.id)),
                        qmodels.FieldCondition(key="session_id", match=qmodels.MatchValue(value=session_id))
                    ]
                )
            )
        )
        return {"status": "success", "message": "Session deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete session: {str(e)}")
