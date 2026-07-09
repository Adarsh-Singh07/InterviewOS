from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.user import User as UserModel
from app.services.asr.deepgram_client import ASRClient
from app.services.llm.orchestrator import generate_answer
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

    # Start ASR processing
    await asr_client.process_stream(websocket)

from app.api.auth import get_current_active_user
from app.core.database import get_db
from app.models.session import InterviewSession
from app.services.llm.orchestrator import AVAILABLE_MODELS

@router.get("/models")
async def get_models():
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
    
    # Check attached documents from the session
    attached_doc_ids = []
    if session_id:
        session = db.query(InterviewSession).filter(
            InterviewSession.id == session_id, 
            InterviewSession.user_id == user_id
        ).first()
        if session:
            attached_doc_ids = [d.id for d in session.attached_documents]
            # Since we will add custom_instructions to InterviewSession, we can append it here
            if hasattr(session, 'custom_instructions') and session.custom_instructions:
                custom_instructions = session.custom_instructions + "\n" + custom_instructions
            
    # RAG search isolated by session_id and attached documents
    context_hits = search_knowledge_base(
        user_id=user_id, 
        query=question, 
        session_id=session_id, 
        attached_doc_ids=attached_doc_ids
    )
    context_text = "\n".join([hit["text"] for hit in context_hits])
    
    # LLM generation wrapper
    async def stream_wrapper():
        full_answer = ""
        from app.services.llm.orchestrator import generate_answer_stream
        async for chunk_data in generate_answer_stream(question, context_text, custom_instructions, preferred_model_id=model_id):
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
