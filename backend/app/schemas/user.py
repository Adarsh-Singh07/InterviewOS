from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    password: Optional[str] = None
    role: Optional[str] = None
    quotas: Optional[Dict] = None
    is_active: Optional[bool] = None
    allowed_models: Optional[List[str]] = None

class UserInDBBase(UserBase):
    id: int
    role: str
    is_active: bool
    quotas: Dict
    allowed_models: Optional[List[str]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None
