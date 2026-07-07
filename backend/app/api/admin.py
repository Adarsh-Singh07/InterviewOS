from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.auth import get_current_admin
from app.models.user import User as UserModel
from app.schemas.user import User, UserUpdate

router = APIRouter()

@router.get("/users", response_model=List[User])
def list_users(db: Session = Depends(get_db), current_admin: UserModel = Depends(get_current_admin)):
    return db.query(UserModel).all()

@router.put("/users/{user_id}", response_model=User)
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db), current_admin: UserModel = Depends(get_current_admin)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.quotas is not None:
        # Merge updated quotas with existing
        current_quotas = user.quotas or {}
        current_quotas.update(user_in.quotas)
        user.quotas = current_quotas
        # Re-assign to force SQLAlchemy to notice the JSON change if needed
        # (Alternatively use flag_modified from sqlalchemy.orm.attributes)
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(user, "quotas")
        
    db.commit()
    db.refresh(user)
    return user
