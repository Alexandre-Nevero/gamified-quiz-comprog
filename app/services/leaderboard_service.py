from sqlalchemy.orm import Session as DBSession

from app.models import User
from app.services.xp_service import calculate_level


def get_leaderboard(db: DBSession) -> list[dict]:
    """Return the top 10 users ordered by XP descending, then username ascending.

    Args:
        db: SQLAlchemy database session.

    Returns:
        A list of up to 10 dicts, each with keys:
            - username (str): The user's username.
            - xp (int): The user's total XP.
            - level (int): The user's level derived from XP (1–5).
    """
    users = (
        db.query(User)
        .order_by(User.xp.desc(), User.username.asc())
        .limit(10)
        .all()
    )

    return [
        {
            "username": user.username,
            "xp": user.xp,
            "level": calculate_level(user.xp),
        }
        for user in users
    ]
