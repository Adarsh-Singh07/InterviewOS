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

def init_additional_db_structures():
    db = SessionLocal()
    try:
        # Check and alter documents
        try:
            db.execute("SELECT parsed_data FROM documents LIMIT 1")
        except Exception:
            db.rollback()
            is_postgres = "postgresql" in settings.DATABASE_URL
            col_type = "JSONB" if is_postgres else "JSON"
            db.execute(f"ALTER TABLE documents ADD COLUMN parsed_data {col_type} NULL")
            db.commit()
            logger.info("Added parsed_data column to documents table")

        # Check and alter interview_sessions
        try:
            db.execute("SELECT summary FROM interview_sessions LIMIT 1")
        except Exception:
            db.rollback()
            db.execute("ALTER TABLE interview_sessions ADD COLUMN summary TEXT NULL")
            db.commit()
            logger.info("Added summary column to interview_sessions table")

        # Check and alter users
        try:
            db.execute("SELECT allowed_models FROM users LIMIT 1")
        except Exception:
            db.rollback()
            is_postgres = "postgresql" in settings.DATABASE_URL
            col_type = "JSONB" if is_postgres else "JSON"
            db.execute(f"ALTER TABLE users ADD COLUMN allowed_models {col_type} NULL")
            db.commit()
            logger.info("Added allowed_models column to users table")

        # Create session_messages table if not exists
        try:
            db.execute("SELECT id FROM session_messages LIMIT 1")
        except Exception:
            db.rollback()
            is_postgres = "postgresql" in settings.DATABASE_URL
            id_type = "SERIAL PRIMARY KEY" if is_postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"
            time_type = "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP" if is_postgres else "DATETIME DEFAULT CURRENT_TIMESTAMP"
            create_query = f"""
            CREATE TABLE session_messages (
                id {id_type},
                session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
                role VARCHAR(50) NOT NULL,
                text TEXT NOT NULL,
                created_at {time_type}
            );
            """
            db.execute(create_query)
            db.commit()
            logger.info("Created session_messages table")
    except Exception as e:
        logger.error(f"Error initializing additional DB structures: {e}")
        db.rollback()
    finally:
        db.close()

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Starting up AI Copilot backend...")
    # Base.metadata.create_all(bind=engine) # Removed to prevent PgBouncer transaction-mode hangs
    init_additional_db_structures()
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
        content={"detail": f"An internal server error occurred: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": "*"}
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
