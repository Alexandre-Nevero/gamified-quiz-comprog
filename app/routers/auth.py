from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session as DBSession
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.services.auth_service import register_user, login_user, logout_user

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    password: str
    guest_xp: int = Field(default=0, ge=0)


class LoginRequest(BaseModel):
    username: str
    password: str
    guest_xp: int = Field(default=0, ge=0)


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: DBSession = Depends(get_db)):
    """Register a new user account."""
    user = register_user(db, body.username, body.password, body.guest_xp)
    return {"message": "User registered successfully", "username": user.username}


@router.post("/login", status_code=200)
def login(body: LoginRequest, db: DBSession = Depends(get_db)):
    """Log in and receive a session token."""
    token = login_user(db, body.username, body.password, body.guest_xp)
    return {"token": token}


@router.post("/logout", status_code=200)
def logout(
    current_user: User = Depends(get_current_user),
    token: Optional[str] = Header(None, alias="Authorization"),
    db: DBSession = Depends(get_db),
):
    """Invalidate the current session token."""
    logout_user(db, token)
    return {"message": "Logged out successfully"}
