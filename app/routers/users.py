from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models import User
from app.services.xp_service import calculate_level

router = APIRouter(tags=["users"])


@router.get("/users/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's username, XP, and computed level."""
    return {
        "username": current_user.username,
        "xp": current_user.xp,
        "level": calculate_level(current_user.xp),
    }
