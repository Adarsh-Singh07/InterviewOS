from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # "resume" or "document"
    extracted_text = Column(Text, nullable=True)
    parsed_data = Column(JSON, nullable=True) # Extracted skills, experience, projects, education, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
