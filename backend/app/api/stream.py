from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.user import User as UserModel
from app.services.asr.deepgram_client import ASRClient
from app.services.memory.qdrant_client import search_knowledge_base
from jose import jwt, JWTError
from app.core.config import settings

router = APIRouter()
asr_client = ASRClient()

# Helper to verify token in websocket
def get_user_from_token(token: str, db: Session) -> UserModel:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        return user
    except JWTError:
        return None

@router.websocket("/audio")
async def websocket_audio(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()
    
    db = SessionLocal()
    user = get_user_from_token(token, db)
    db.close()
    
    if not user or not user.is_active or user.role not in ["admin", "approved", "trial"]:
        await websocket.send_text('{"error": "Unauthorized or pending approval"}')
        await websocket.close()
        return

    # Check monthly transcription limit
    if user.role != "admin" and user.quotas:
        monthly_limit = user.quotas.get("transcription_minutes_monthly", 0)
        used_minutes = user.quotas.get("transcription_minutes_used", 0)
        if monthly_limit > 0 and used_minutes >= monthly_limit:
            await websocket.send_text('{"error": "Transcription limit exceeded. Please contact admin."}')
            await websocket.close()
            return

    import time
    start_time = time.time()
    try:
        # Start ASR processing
        await asr_client.process_stream(websocket)
    finally:
        # Calculate session length and update quotas
        duration_sec = time.time() - start_time
        duration_min = duration_sec / 60.0
        
        db = SessionLocal()
        try:
            db_user = db.query(UserModel).filter(UserModel.id == user.id).first()
            if db_user:
                current_quotas = dict(db_user.quotas or {})
                current_quotas["transcription_minutes_used"] = current_quotas.get("transcription_minutes_used", 0) + duration_min
                db_user.quotas = current_quotas
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(db_user, "quotas")
                db.commit()
        except Exception as e:
            print(f"Error updating user transcription usage: {e}")
        finally:
            db.close()

from app.api.auth import get_current_active_user
from app.core.database import get_db
from app.models.session import InterviewSession
from app.services.llm.orchestrator import AVAILABLE_MODELS

@router.get("/models")
async def get_models(current_user: UserModel = Depends(get_current_active_user)):
    user_models = current_user.allowed_models
    if user_models is not None:
        filtered = [m for m in AVAILABLE_MODELS if m["id"] in user_models]
        return {"models": filtered}
    return {"models": AVAILABLE_MODELS}

from fastapi.responses import StreamingResponse
import json

@router.post("/generate")
async def manual_generate_answer(
    question: str, 
    model_id: str = Query(None),
    custom_instructions: str = "",
    session_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    user_id = current_user.id
    
    # Check model permissions
    if model_id:
        user_models = current_user.allowed_models
        if user_models is not None and model_id not in user_models:
            raise HTTPException(status_code=403, detail="You do not have permission to use this model.")
            
    # Check attached documents from the session
    attached_doc_ids = []
    if session_id:
        session = db.query(InterviewSession).filter(
            InterviewSession.id == session_id, 
            InterviewSession.user_id == user_id
        ).first()
        if session:
            attached_doc_ids = [d.id for d in session.attached_documents]
            if hasattr(session, 'custom_instructions') and session.custom_instructions:
                custom_instructions = session.custom_instructions + "\n" + custom_instructions
            
    # Fetch chronological session chat history for memory
    session_history = ""
    if session_id:
        try:
            from app.models.session import SessionMessage
            messages = db.query(SessionMessage).filter(SessionMessage.session_id == session_id).order_by(SessionMessage.created_at.asc()).all()
            if messages:
                session_history = "ACTIVE CHAT HISTORY FOR THIS SESSION (CHRONOLOGICAL):\n"
                for msg in messages:
                    role_label = "Interviewer Question" if msg.role == "interviewer" else "Candidate Copilot Answer"
                    session_history += f"[{role_label}]: {msg.text}\n\n"
        except Exception as db_err:
            print(f"Error fetching session chat history: {db_err}")

    # RAG search isolated by session_id and attached documents
    context_hits = search_knowledge_base(
        user_id=user_id, 
        query=question, 
        session_id=session_id, 
        attached_doc_ids=attached_doc_ids
    )
    context_text = "\n".join([hit["text"] for hit in context_hits])
    
    combined_context = ""
    if session_history:
        combined_context += session_history + "\n---\n"
    if context_text:
        combined_context += "SEMANTIC KNOWLEDGE BASE HITS:\n" + context_text
        
    # LLM generation wrapper
    async def stream_wrapper():
        full_answer = ""
        from app.services.llm.orchestrator import generate_answer_stream
        async for chunk_data in generate_answer_stream(question, combined_context, custom_instructions, preferred_model_id=model_id):
            yield chunk_data
            if chunk_data.startswith("data: ") and chunk_data != "data: [DONE]\n\n":
                try:
                    data = json.loads(chunk_data[6:])
                    if "answer" in data:
                        full_answer += data["answer"]
                except:
                    pass
        
        # Save the interaction to memory with session_id
        if full_answer:
            from app.services.memory.qdrant_client import ingest_document
            import asyncio
            interaction = f"Interview Question: {question}\nCopilot Answer: {full_answer}"
            await asyncio.to_thread(
                ingest_document, 
                user_id=user_id, 
                text=interaction, 
                source=f"session_{session_id}_interaction",
                session_id=session_id
            )
            
            # Save interaction to DB transcripts table
            if session_id:
                try:
                    from app.models.session import SessionMessage
                    db_local = SessionLocal()
                    msg_q = SessionMessage(session_id=session_id, role="interviewer", text=question)
                    msg_a = SessionMessage(session_id=session_id, role="copilot", text=full_answer)
                    db_local.add(msg_q)
                    db_local.add(msg_a)
                    db_local.commit()
                    db_local.close()
                except Exception as db_err:
                    print(f"Error saving SessionMessage: {db_err}")
            
    return StreamingResponse(stream_wrapper(), media_type="text/event-stream")

@router.delete("/memory")
async def clear_memory(
    session_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    user_id = current_user.id
    from app.services.memory.qdrant_client import client
    from qdrant_client.http import models as qmodels
    try:
        # Build filter to delete memory for this user (and optionally specific session)
        filter_conditions = [qmodels.FieldCondition(key="user_id", match=qmodels.MatchValue(value=user_id))]
        if session_id:
            filter_conditions.append(qmodels.FieldCondition(key="session_id", match=qmodels.MatchValue(value=session_id)))
            
        client.delete(
            collection_name="knowledge_base", # Ensure collection name matches COLLECTION_NAME
            points_selector=qmodels.FilterSelector(
                filter=qmodels.Filter(must=filter_conditions)
            )
        )
        return {"status": "success", "message": "Memory cleared"}
    except Exception as e:
        print(f"Error clearing memory: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to clear memory: {str(e)}")
