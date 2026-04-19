import json
import random
import re
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session as DBSession

from app.models import Choice, CodeBlock, Question, QuizSession
from app.services.xp_service import XP_BY_DIFFICULTY, award_xp


def select_questions(db: DBSession, topic: str, difficulty: str) -> list[int]:
    """Select exactly 10 random question IDs for the given topic and difficulty.

    Queries the questions table filtered by topic and difficulty, then uses
    random.sample to pick 10 question IDs. Raises HTTP 400 if fewer than 10
    questions are available.

    Args:
        db: SQLAlchemy database session.
        topic: The quiz topic to filter by.
        difficulty: The difficulty level to filter by ("Easy", "Medium", "Hard").

    Returns:
        A list of exactly 10 question IDs (integers).

    Raises:
        HTTPException(400): If fewer than 10 questions are available for the
            given topic and difficulty combination.
    """
    questions = (
        db.query(Question.id)
        .filter(Question.topic == topic, Question.difficulty == difficulty)
        .all()
    )

    if len(questions) < 10:
        raise HTTPException(
            status_code=400,
            detail="Not enough questions available for this topic and difficulty",
        )

    question_ids = [q.id for q in questions]
    return random.sample(question_ids, 10)


def start_session(db: DBSession, topic: str, difficulty: str, user_id: Optional[int] = None) -> int:
    """Create a new quiz session and return its ID.

    Selects 10 question IDs via select_questions, creates a QuizSession record,
    commits it to the database, and returns the new session's integer ID.

    Args:
        db: SQLAlchemy database session.
        topic: The quiz topic.
        difficulty: The difficulty level ("Easy", "Medium", "Hard").
        user_id: The authenticated user's ID, or None for a guest session.

    Returns:
        The integer ID of the newly created QuizSession.
    """
    question_ids = select_questions(db, topic, difficulty)

    session = QuizSession(
        user_id=user_id,
        topic=topic,
        difficulty=difficulty,
        question_ids=json.dumps(question_ids),
        answers="[]",
        completed=0,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session.id


def normalize_answer(s: str) -> str:
    """Normalize a fill-in-the-blank answer for lenient comparison.

    Steps applied in order:
        1. Strip leading/trailing whitespace
        2. Convert to lowercase
        3. Collapse multiple consecutive spaces into a single space
        4. Strip trailing semicolons (and any whitespace that follows them)

    The function is pure (no side effects) and idempotent:
        normalize_answer(normalize_answer(s)) == normalize_answer(s)

    Examples:
        >>> normalize_answer("  Hello  World;  ")
        'hello world'
        >>> normalize_answer('printf( "hello" );')
        'printf( "hello" )'
        >>> normalize_answer("  INT  ")
        'int'
    """
    s = s.strip()
    s = s.lower()
    s = re.sub(r" {2,}", " ", s)
    s = s.rstrip(";")
    return s


def get_question(db: DBSession, session_id: int, n: int) -> dict:
    """Retrieve question n (0-indexed) from a quiz session.

    Loads the QuizSession by session_id, parses the stored question_ids JSON,
    validates the index n, fetches the Question, and returns a dict with the
    question data. For multiple_choice questions, choices are shuffled. For
    code_arrangement questions, code blocks are shuffled and correct_index is
    never included.

    Args:
        db: SQLAlchemy database session.
        session_id: The ID of the QuizSession.
        n: 0-based index of the question to retrieve (0–9).

    Returns:
        A dict containing question data. Always includes: id, question_type,
        question_text, topic, difficulty. Additionally:
        - multiple_choice: includes 'choices' (shuffled list of {id, label, text})
        - code_arrangement: includes 'code_blocks' (shuffled list of {id, content})
        - true_false / fill_blank: no extra fields

    Raises:
        HTTPException(404): If the session is not found or n is out of range.
    """
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    question_ids = json.loads(session.question_ids)

    if n < 0 or n > 9:
        raise HTTPException(status_code=404, detail="Question not found")

    question_id = question_ids[n]
    question = db.query(Question).filter(Question.id == question_id).first()

    result = {
        "id": question.id,
        "question_type": question.question_type,
        "question_text": question.question_text,
        "topic": question.topic,
        "difficulty": question.difficulty,
    }

    if question.question_type == "multiple_choice":
        choices = db.query(Choice).filter(Choice.question_id == question.id).all()
        choices_list = [{"id": c.id, "label": c.label, "text": c.text} for c in choices]
        random.shuffle(choices_list)
        result["choices"] = choices_list

    elif question.question_type == "code_arrangement":
        code_blocks = db.query(CodeBlock).filter(CodeBlock.question_id == question.id).all()
        blocks_list = [{"id": cb.id, "content": cb.content} for cb in code_blocks]
        random.shuffle(blocks_list)
        result["code_blocks"] = blocks_list

    return result


def evaluate_answer(db: DBSession, session_id: int, n: int, submitted_answer) -> dict:
    """Evaluate the submitted answer for question n in a quiz session.

    Loads the QuizSession, validates the question index, fetches the question,
    evaluates the answer based on question type, records the result in the
    session's answers JSON, awards XP to registered users, and marks the session
    completed after the 10th question (index 9).

    Answer evaluation by type:
        - multiple_choice / true_false: direct case-sensitive string comparison.
        - fill_blank: normalize both sides with normalize_answer, then compare.
        - code_arrangement: compare submitted list of CodeBlock IDs (in order)
          against the IDs sorted by correct_index ascending.

    Args:
        db: SQLAlchemy database session.
        session_id: The ID of the QuizSession.
        n: 0-based index of the question being answered (0–9).
        submitted_answer: The answer submitted by the user. A string for
            multiple_choice, true_false, and fill_blank; a list of int IDs for
            code_arrangement.

    Returns:
        A dict with keys:
            - correct (bool): Whether the answer was correct.
            - correct_answer (str | list): The correct answer. A list of block
              IDs in correct order for code_arrangement; the question's
              correct_answer string for all other types.
            - xp_earned (int): XP earned for this answer (0 if incorrect).

    Raises:
        HTTPException(404): If the session is not found or n is out of range.
    """
    # Load session
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Validate question index
    question_ids = json.loads(session.question_ids)
    if n < 0 or n > 9:
        raise HTTPException(status_code=404, detail="Question not found")

    question_id = question_ids[n]
    question = db.query(Question).filter(Question.id == question_id).first()

    # Evaluate answer based on question type
    q_type = question.question_type

    if q_type in ("multiple_choice", "true_false"):
        correct = str(submitted_answer) == question.correct_answer
        correct_answer_out = question.correct_answer

    elif q_type == "fill_blank":
        correct = normalize_answer(str(submitted_answer)) == normalize_answer(question.correct_answer)
        correct_answer_out = question.correct_answer

    elif q_type == "code_arrangement":
        # Get code blocks sorted by correct_index to determine correct order
        blocks = (
            db.query(CodeBlock)
            .filter(CodeBlock.question_id == question.id)
            .order_by(CodeBlock.correct_index)
            .all()
        )
        correct_order_ids = [b.id for b in blocks]

        # submitted_answer should be a list of int IDs
        if isinstance(submitted_answer, list):
            submitted_ids = [int(x) for x in submitted_answer]
        else:
            submitted_ids = []

        correct = submitted_ids == correct_order_ids
        correct_answer_out = correct_order_ids

    else:
        # Unknown type — treat as incorrect
        correct = False
        correct_answer_out = question.correct_answer

    # Determine XP earned
    xp_earned = 0
    if correct:
        if session.user_id is not None:
            # Registered user: persist XP via award_xp
            result = award_xp(db, session.user_id, session.difficulty)
            xp_earned = result["xp_earned"]
        else:
            # Guest: compute XP but do not persist
            xp_earned = XP_BY_DIFFICULTY.get(session.difficulty, 0)

    # Append result to session answers
    answers = json.loads(session.answers)
    answers.append({
        "question_id": question_id,
        "correct": correct,
        "xp_earned": xp_earned,
    })
    session.answers = json.dumps(answers)

    # Mark session completed after the 10th question (index 9)
    if n == 9:
        session.completed = 1

    db.commit()

    return {
        "correct": correct,
        "correct_answer": correct_answer_out,
        "xp_earned": xp_earned,
    }


def get_summary(db: DBSession, session_id: int) -> dict:
    """Return a summary of a completed quiz session.

    Loads the QuizSession by session_id, parses the stored answers JSON array,
    counts correct answers, and sums up XP earned. Always includes xp_earned
    even for guest sessions so the frontend can store it in localStorage.

    Args:
        db: SQLAlchemy database session.
        session_id: The ID of the QuizSession.

    Returns:
        A dict with keys:
            - correct (int): Number of questions answered correctly.
            - total (int): Always 10.
            - xp_earned (int): Total XP earned across all answers.

    Raises:
        HTTPException(404): If the session is not found.
    """
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    answers = json.loads(session.answers)
    correct = sum(1 for a in answers if a.get("correct") is True)
    xp_earned = sum(a.get("xp_earned", 0) for a in answers)

    return {
        "correct": correct,
        "total": 10,
        "xp_earned": xp_earned,
    }
