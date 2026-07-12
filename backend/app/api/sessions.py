from fastapi import APIRouter, Depends, HTTPException, Query
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
            "summary": s.summary,
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
        "summary": session.summary,
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

# Get session messages transcript
@router.get("/{session_id}/transcript")
async def get_session_transcript(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    from app.models.session import SessionMessage
    messages = db.query(SessionMessage).filter(SessionMessage.session_id == session_id).order_by(SessionMessage.created_at.asc()).all()
    
    return [
        {
            "id": m.id,
            "role": m.role,
            "text": m.text,
            "created_at": m.created_at
        } for m in messages
    ]

import json
# Generate summary for session transcript
@router.post("/{session_id}/summary")
async def generate_session_summary(
    session_id: int,
    model_id: str = Query("gpt-5.4-mini"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    from app.models.session import SessionMessage
    messages = db.query(SessionMessage).filter(SessionMessage.session_id == session_id).order_by(SessionMessage.created_at.asc()).all()
    if not messages:
        raise HTTPException(status_code=400, detail="No transcript messages recorded for this session.")
        
    # Build transcript text for the prompt
    transcript_text = ""
    for msg in messages:
        role_label = "Interviewer" if msg.role == "interviewer" else "Candidate Copilot"
        transcript_text += f"{role_label}: {msg.text}\n\n"
        
    summary_prompt = (
        "You are an expert interviewer coach. Analyze the following interview transcription between the Interviewer and the Candidate's AI Copilot. "
        "Provide a comprehensive, professional summary of the interview. Highlight: \n"
        "1. Core topics discussed.\n"
        "2. Key strengths demonstrated in the answers.\n"
        "3. Key improvement areas or topics that could be clarified further.\n"
        "Keep the tone encouraging, constructive, and highly professional.\n\n"
        f"Interview Transcript:\n{transcript_text}"
    )
    
    from app.services.llm.orchestrator import generate_answer_stream
    summary_text = ""
    try:
        async for chunk in generate_answer_stream(summary_prompt, context="", custom_instructions="", preferred_model_id=model_id):
            if chunk.startswith("data: ") and chunk != "data: [DONE]\n\n":
                try:
                    data = json.loads(chunk[6:])
                    if "answer" in data:
                        summary_text += data["answer"]
                except:
                    pass
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate summary: {str(e)}")
        
    if not summary_text:
        summary_text = "Failed to compile summary. Check that models are properly configured."
    else:
        session.summary = summary_text
        db.commit()
        db.refresh(session)
        
    return {"summary": summary_text}
