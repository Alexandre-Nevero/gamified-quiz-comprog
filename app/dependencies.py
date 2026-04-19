from typing import Optional

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models import Session as SessionModel, User


def get_current_user(
    token: Optional[str] = Header(None, alias="Authorization"),
    db: DBSession = Depends(get_db),
) -> User:
    """FastAPI dependency that returns the authenticated User or raises HTTP 401."""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = db.query(SessionModel).filter(SessionModel.token == token).first()
    if session is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = db.query(User).filter(User.id == session.user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return user


def get_optional_user(
    token: Optional[str] = Header(None, alias="Authorization"),
    db: DBSession = Depends(get_db),
) -> Optional[User]:
    """FastAPI dependency that returns the authenticated User or None for guests."""
    if not token:
        return None

    session = db.query(SessionModel).filter(SessionModel.token == token).first()
    if session is None:
        return None

    user = db.query(User).filter(User.id == session.user_id).first()
    return user
