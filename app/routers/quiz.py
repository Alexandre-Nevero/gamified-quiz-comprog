from typing import List, Optional, Union

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_optional_user
from app.models import User
from app.services.quiz_service import (
    evaluate_answer,
    get_question,
    get_summary,
    start_session,
)

router = APIRouter()

VALID_TOPICS = [
    "Arrays",
    "Multidimensional Arrays",
    "Basic Sorting Algorithms",
    "Binary Search",
    "Functions",
    "Pointers",
]

VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"]


class StartQuizRequest(BaseModel):
    topic: str
    difficulty: str

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, v: str) -> str:
        if v not in VALID_TOPICS:
            raise ValueError(
                f"topic must be one of: {', '.join(VALID_TOPICS)}"
            )
        return v

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: str) -> str:
        if v not in VALID_DIFFICULTIES:
            raise ValueError(
                f"difficulty must be one of: {', '.join(VALID_DIFFICULTIES)}"
            )
        return v


class AnswerRequest(BaseModel):
    answer: Union[str, List[int]]


@router.post("/quiz/start")
def start_quiz(
    body: StartQuizRequest,
    db: DBSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    """Start a new quiz session. Guests are allowed (user may be None)."""
    session_id = start_session(
        db,
        topic=body.topic,
        difficulty=body.difficulty,
        user_id=user.id if user else None,
    )
    return {"session_id": session_id}


@router.get("/quiz/{session_id}/question/{n}")
def get_quiz_question(
    session_id: int,
    n: int,
    db: DBSession = Depends(get_db),
):
    """Return question n (0-indexed) for the given quiz session."""
    return get_question(db, session_id, n)


@router.post("/quiz/{session_id}/answer/{n}")
def submit_answer(
    session_id: int,
    n: int,
    body: AnswerRequest,
    db: DBSession = Depends(get_db),
):
    """Submit an answer for question n in the given quiz session."""
    return evaluate_answer(db, session_id, n, body.answer)


@router.get("/quiz/{session_id}/summary")
def quiz_summary(
    session_id: int,
    db: DBSession = Depends(get_db),
):
    """Return the summary for a quiz session."""
    return get_summary(db, session_id)
