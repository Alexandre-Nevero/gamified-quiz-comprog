import secrets
from datetime import datetime, timezone

from passlib.context import CryptContext
from sqlalchemy.orm import Session as DBSession
from fastapi import HTTPException

from app.models import User, Session as SessionModel

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def register_user(db: DBSession, username: str, password: str, guest_xp: int = 0) -> User:
    """Register a new user account.

    Validates username length (3–32 chars) and password length (6+ chars),
    checks for duplicate usernames, hashes the password with bcrypt, creates
    a User record with xp=0, and optionally adds guest_xp to the new user's XP.

    Args:
        db: SQLAlchemy database session.
        username: Desired username (3–32 characters).
        password: Plaintext password (6+ characters).
        guest_xp: Optional XP accumulated as a guest to transfer to the new account.

    Returns:
        The newly created User ORM instance.

    Raises:
        HTTPException(400): If username is too short, too long, already taken,
                            or password is too short.
    """
    # Validate username length
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username too short")
    if len(username) > 32:
        raise HTTPException(status_code=400, detail="Username too long")

    # Validate password length
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password too short")

    # Check for duplicate username
    existing = db.query(User).filter(User.username == username).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Hash the password
    hashed_password = pwd_context.hash(password)

    # Create the user with xp=0 + any transferred guest XP
    user = User(
        username=username,
        password=hashed_password,
        xp=guest_xp,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def login_user(db: DBSession, username: str, password: str, guest_xp: int = 0) -> str:
    """Log in a user and return a session token.

    Looks up the user by username, verifies the password with bcrypt, creates
    a Session record with a random token, and optionally transfers guest XP to
    the user's account.

    Args:
        db: SQLAlchemy database session.
        username: The username to authenticate.
        password: The plaintext password to verify.
        guest_xp: Optional XP accumulated as a guest to transfer to the account.

    Returns:
        The session token string (hex, 64 characters).

    Raises:
        HTTPException(401): If the username does not exist or the password is wrong.
    """
    # Look up user by username
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Verify password
    if not pwd_context.verify(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Create session record
    token = secrets.token_hex(32)
    created_at = datetime.now(timezone.utc).isoformat()
    session = SessionModel(
        token=token,
        user_id=user.id,
        created_at=created_at,
    )
    db.add(session)

    # Transfer guest XP atomically if any
    if guest_xp > 0:
        user.xp += guest_xp

    db.commit()

    return token


def logout_user(db: DBSession, token: str) -> None:
    """Invalidate a session token.

    Deletes the Session record matching the given token. If no matching session
    is found, does nothing (idempotent).

    Args:
        db: SQLAlchemy database session.
        token: The session token to invalidate.

    Returns:
        None
    """
    session = db.query(SessionModel).filter(SessionModel.token == token).first()
    if session is not None:
        db.delete(session)
        db.commit()
