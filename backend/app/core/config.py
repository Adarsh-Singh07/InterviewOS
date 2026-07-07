from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Personal AI Copilot"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "supersecretkey-please-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # DB
    DATABASE_URL: str = "sqlite:///./copilot.db" # Default local fallback
    
    # Admin Bootstrap (read once on first boot)
    ADMIN_EMAIL: str = "admin@copilot.local"
    ADMIN_PASSWORD: str = "admin123"
    
    # Third party
    DEEPGRAM_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    GEMINI_API_KEY_1: Optional[str] = None
    GEMINI_API_KEY_2: Optional[str] = None
    
    class Config:
        import os
        env_file = os.getenv("ENV_FILE", "../.env.development")

settings = Settings()
