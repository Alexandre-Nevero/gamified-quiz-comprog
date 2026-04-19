from sqlalchemy.orm import Session as DBSession

from app.models import User


# XP awarded per correct answer by difficulty
XP_BY_DIFFICULTY = {
    "Easy": 10,
    "Medium": 20,
    "Hard": 30,
}


def award_xp(db: DBSession, user_id: int, difficulty: str) -> dict:
    """Award XP to a registered user for a correct answer.

    Looks up the user by user_id, adds the XP for the given difficulty to their
    cumulative total, commits the change, and returns a summary dict.

    Args:
        db: SQLAlchemy database session.
        user_id: The ID of the user to award XP to.
        difficulty: The difficulty of the question answered ("Easy", "Medium", "Hard").

    Returns:
        A dict with keys:
            - xp_earned (int): XP awarded for this answer.
            - new_xp (int): User's total XP after the award.
            - new_level (int): User's level after the award.
            - level_up (bool): True if the level increased as a result of this award.
    """
    xp_earned = XP_BY_DIFFICULTY.get(difficulty, 0)

    user = db.query(User).filter(User.id == user_id).first()
    old_level = calculate_level(user.xp)
    user.xp += xp_earned
    db.commit()
    db.refresh(user)
    new_level = calculate_level(user.xp)

    return {
        "xp_earned": xp_earned,
        "new_xp": user.xp,
        "new_level": new_level,
        "level_up": new_level > old_level,
    }


def calculate_level(xp: int) -> int:
    """Return the level (1–5) corresponding to the given XP value.

    Thresholds:
        Level 1:   0 –  49 XP
        Level 2:  50 – 119 XP
        Level 3: 120 – 249 XP
        Level 4: 250 – 499 XP
        Level 5: 500+    XP
    """
    if xp >= 500:
        return 5
    if xp >= 250:
        return 4
    if xp >= 120:
        return 3
    if xp >= 50:
        return 2
    return 1
