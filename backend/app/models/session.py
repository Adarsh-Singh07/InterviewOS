from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

# Association table for many-to-many between Sessions and Documents
session_documents = Table(
    "session_documents",
    Base.metadata,
    Column("session_id", Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), primary_key=True),
    Column("document_id", Integer, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True)
)

class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    company = Column(String, nullable=False)
    job_description = Column(Text, nullable=True)
    custom_instructions = Column(Text, nullable=True)
    summary = Column(Text, nullable=True) # AI generated summary of the session
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    attached_documents = relationship("Document", secondary=session_documents)

class SessionMessage(Base):
    __tablename__ = "session_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False) # "interviewer" or "copilot"
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
