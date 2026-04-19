from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.services.leaderboard_service import get_leaderboard

router = APIRouter(tags=["leaderboard"])


@router.get("/leaderboard")
def leaderboard(db: DBSession = Depends(get_db)):
    """Return the top 10 users ordered by XP descending, then username ascending.

    No authentication required.
    """
    return get_leaderboard(db)
