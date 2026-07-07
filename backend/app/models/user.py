from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    role = Column(String, default="pending") # "admin", "approved", "trial", "blocked", "pending"
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Quotas and usage limits (stored as JSON for flexibility, or could be separate columns)
    quotas = Column(JSON, default=lambda: {
        "transcription_minutes_monthly": 0,
        "transcription_minutes_used": 0,
        "ai_generations_monthly": 0,
        "ai_generations_used": 0,
        "ocr_pages_monthly": 0,
        "ocr_pages_used": 0,
    })
