from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import contextlib
from loguru import logger

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.models.user import User as UserModel
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.documents import router as documents_router
from app.api.stream import router as stream_router
from app.api.sessions import router as sessions_router
from app.core.logging import setup_logging

def bootstrap_admin():
    db = SessionLocal()
    try:
        admin_exists = db.query(UserModel).filter(UserModel.role == "admin").first()
        if not admin_exists:
            admin_user = UserModel(
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            logger.info(f"Bootstrapped admin account for {settings.ADMIN_EMAIL}")
    finally:
        db.close()

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Starting up AI Copilot backend...")
    # Base.metadata.create_all(bind=engine) # Removed to prevent PgBouncer transaction-mode hangs
    bootstrap_admin()
    yield
    logger.info("Shutting down AI Copilot backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Personal AI Copilot with real-time audio transcription and intelligence layer.",
    version="1.5.0",
    lifespan=lifespan
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception during request {request.method} {request.url}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please check the logs."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(documents_router, prefix=f"{settings.API_V1_STR}/documents", tags=["documents"])
app.include_router(stream_router, prefix=f"{settings.API_V1_STR}/stream", tags=["stream"])
app.include_router(sessions_router, prefix=f"{settings.API_V1_STR}/sessions", tags=["sessions"])

@app.get("/")
def root():
    return {"message": "Welcome to Personal AI Copilot API"}
