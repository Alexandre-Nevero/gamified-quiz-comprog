"""Unit tests for the Quiz engine (start, question, answer, summary endpoints)."""
import json
import pytest
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.models import Choice, Question, User
from app.main import app

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TEST_TOPIC = "Arrays"
TEST_DIFFICULTY = "Easy"


def _seed_questions(db_session, topic: str = TEST_TOPIC, difficulty: str = TEST_DIFFICULTY, count: int = 10):
    """Insert `count` minimal multiple_choice questions into the DB.

    Each question gets 4 choices; the correct answer is always "A".
    Returns the list of created Question objects.
    """
    questions = []
    for i in range(count):
        q = Question(
            topic=topic,
            difficulty=difficulty,
            question_type="multiple_choice",
            question_text=f"Question {i + 1}: What is an array?",
            correct_answer="A",
        )
        db_session.add(q)
        db_session.flush()  # get q.id

        for label, text in [("A", "Correct answer"), ("B", "Wrong B"), ("C", "Wrong C"), ("D", "Wrong D")]:
            db_session.add(Choice(question_id=q.id, label=label, text=text))

        questions.append(q)

    db_session.commit()
    return questions


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def seeded_client(db_engine):
    """TestClient with 10 seeded questions for Arrays/Easy in the in-memory DB."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)

    # Seed questions using a dedicated session
    seed_session = TestingSessionLocal()
    try:
        _seed_questions(seed_session)
    finally:
        seed_session.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def seeded_client_with_user(db_engine):
    """TestClient with 10 seeded questions AND a registered user for XP tests."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)

    seed_session = TestingSessionLocal()
    try:
        _seed_questions(seed_session)
    finally:
        seed_session.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client, db_engine
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# POST /api/quiz/start
# ---------------------------------------------------------------------------

def test_start_quiz_valid_returns_200_and_session_id(seeded_client: TestClient):
    """POST /api/quiz/start with valid topic+difficulty returns 200 and session_id."""
    response = seeded_client.post(
        "/api/quiz/start",
        json={"topic": TEST_TOPIC, "difficulty": TEST_DIFFICULTY},
    )
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert isinstance(data["session_id"], int)


def test_start_quiz_invalid_topic_returns_422(client: TestClient):
    """POST /api/quiz/start with an invalid topic returns 422."""
    response = client.post(
        "/api/quiz/start",
        json={"topic": "InvalidTopic", "difficulty": "Easy"},
    )
    assert response.status_code == 422


def test_start_quiz_invalid_difficulty_returns_422(client: TestClient):
    """POST /api/quiz/start with an invalid difficulty returns 422."""
    response = client.post(
        "/api/quiz/start",
        json={"topic": TEST_TOPIC, "difficulty": "SuperHard"},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/quiz/{session_id}/question/{n}
# ---------------------------------------------------------------------------

def test_get_question_0_returns_200_with_data(seeded_client: TestClient):
    """GET /api/quiz/{session_id}/question/0 returns 200 with question data."""
    start = seeded_client.post(
        "/api/quiz/start",
        json={"topic": TEST_TOPIC, "difficulty": TEST_DIFFICULTY},
    )
    session_id = start.json()["session_id"]

    response = seeded_client.get(f"/api/quiz/{session_id}/question/0")
    assert response.status_code == 200
    data = response.json()
    assert "question_text" in data
    assert "question_type" in data
    assert "id" in data


def test_get_question_out_of_range_returns_404(seeded_client: TestClient):
    """GET /api/quiz/{session_id}/question/10 returns 404 (out of range)."""
    start = seeded_client.post(
        "/api/quiz/start",
        json={"topic": TEST_TOPIC, "difficulty": TEST_DIFFICULTY},
    )
    session_id = start.json()["session_id"]

    response = seeded_client.get(f"/api/quiz/{session_id}/question/10")
    assert response.status_code == 404


def test_get_question_nonexistent_session_returns_404(seeded_client: TestClient):
    """GET /api/quiz/{nonexistent_session_id}/question/0 returns 404."""
    response = seeded_client.get("/api/quiz/99999/question/0")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/quiz/{session_id}/answer/{n}
# ---------------------------------------------------------------------------

def test_answer_correct_returns_correct_true(seeded_client: TestClient):
    """POST /api/quiz/{session_id}/answer/0 with correct answer returns correct=True."""
    start = seeded_client.post(
        "/api/quiz/start",
        json={"topic": TEST_TOPIC, "difficulty": TEST_DIFFICULTY},
    )
    session_id = start.json()["session_id"]

    # Fetch question 0 to determine the correct answer
    q_resp = seeded_client.get(f"/api/quiz/{session_id}/question/0")
    assert q_resp.status_code == 200
    q_data = q_resp.json()

    # For multiple_choice, correct_answer is the label ("A")
    # We seeded all questions with correct_answer="A"
    correct_answer = "A"

    response = seeded_client.post(
        f"/api/quiz/{session_id}/answer/0",
        json={"answer": correct_answer},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is True


def test_answer_wrong_returns_correct_false(seeded_client: TestClient):
    """POST /api/quiz/{session_id}/answer/0 with wrong answer returns correct=False."""
    start = seeded_client.post(
        "/api/quiz/start",
        json={"topic": TEST_TOPIC, "difficulty": TEST_DIFFICULTY},
    )
    session_id = start.json()["session_id"]

    response = seeded_client.post(
        f"/api/quiz/{session_id}/answer/0",
        json={"answer": "D"},  # wrong answer (correct is "A")
    )
    assert response.status_code == 200
    data = response.json()
    assert data["correct"] is False


# ---------------------------------------------------------------------------
# GET /api/quiz/{session_id}/summary
# ---------------------------------------------------------------------------

def _complete_session(test_client: TestClient, session_id: int, correct_answer: str = "A"):
    """Answer all 10 questions in a session with the given answer."""
    for n in range(10):
        test_client.post(
            f"/api/quiz/{session_id}/answer/{n}",
            json={"answer": correct_answer},
        )


def test_summary_after_all_questions_returns_correct_shape(seeded_client: TestClient):
    """After answering all 10 questions, summary returns correct shape."""
    start = seeded_client.post(
        "/api/quiz/start",
        json={"topic": TEST_TOPIC, "difficulty": TEST_DIFFICULTY},
    )
    session_id = start.json()["session_id"]

    _complete_session(seeded_client, session_id, correct_answer="A")

    response = seeded_client.get(f"/api/quiz/{session_id}/summary")
    assert response.status_code == 200
    data = response.json()
    assert "correct" in data
    assert "total" in data
    assert "xp_earned" in data
    assert data["total"] == 10
    assert isinstance(data["correct"], int)
    assert isinstance(data["xp_earned"], int)


def test_summary_all_correct_answers(seeded_client: TestClient):
    """Summary reflects 10 correct answers when all answers are correct."""
    start = seeded_client.post(
        "/api/quiz/start",
        json={"topic": TEST_TOPIC, "difficulty": TEST_DIFFICULTY},
    )
    session_id = start.json()["session_id"]

    _complete_session(seeded_client, session_id, correct_answer="A")

    response = seeded_client.get(f"/api/quiz/{session_id}/summary")
    data = response.json()
    assert data["correct"] == 10
    assert data["total"] == 10


def test_summary_all_wrong_answers(seeded_client: TestClient):
    """Summary reflects 0 correct answers when all answers are wrong."""
    start = seeded_client.post(
        "/api/quiz/start",
        json={"topic": TEST_TOPIC, "difficulty": TEST_DIFFICULTY},
    )
    session_id = start.json()["session_id"]

    _complete_session(seeded_client, session_id, correct_answer="D")  # wrong

    response = seeded_client.get(f"/api/quiz/{session_id}/summary")
    data = response.json()
    assert data["correct"] == 0
    assert data["total"] == 10


# ---------------------------------------------------------------------------
# Guest session: XP in summary but NOT persisted to DB
# ---------------------------------------------------------------------------

def test_guest_session_xp_in_summary_not_persisted(seeded_client_with_user):
    """Guest session: xp_earned is present in summary but NOT persisted to DB."""
    test_client, db_engine = seeded_client_with_user

    # Start a guest session (no auth header)
    start = test_client.post(
        "/api/quiz/start",
        json={"topic": TEST_TOPIC, "difficulty": TEST_DIFFICULTY},
    )
    session_id = start.json()["session_id"]

    # Answer all 10 correctly
    _complete_session(test_client, session_id, correct_answer="A")

    # Summary should include xp_earned
    summary_resp = test_client.get(f"/api/quiz/{session_id}/summary")
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert "xp_earned" in summary
    assert summary["xp_earned"] > 0  # 10 correct Easy answers = 10 * 10 = 100 XP

    # No User records should exist (guest session, no registration)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    with TestingSessionLocal() as db:
        user_count = db.query(User).count()
    assert user_count == 0


# ---------------------------------------------------------------------------
# Registered user session: XP IS persisted to DB
# ---------------------------------------------------------------------------

def test_registered_user_xp_persisted_to_db(seeded_client_with_user):
    """Registered user session: XP is persisted to DB after correct answers."""
    test_client, db_engine = seeded_client_with_user

    # Register and log in
    test_client.post(
        "/api/auth/register",
        json={"username": "quizuser", "password": "password1"},
    )
    login_resp = test_client.post(
        "/api/auth/login",
        json={"username": "quizuser", "password": "password1"},
    )
    token = login_resp.json()["token"]

    # Start a session as a registered user
    start = test_client.post(
        "/api/quiz/start",
        json={"topic": TEST_TOPIC, "difficulty": TEST_DIFFICULTY},
        headers={"Authorization": token},
    )
    assert start.status_code == 200
    session_id = start.json()["session_id"]

    # Answer all 10 correctly
    for n in range(10):
        test_client.post(
            f"/api/quiz/{session_id}/answer/{n}",
            json={"answer": "A"},
            headers={"Authorization": token},
        )

    # Summary should include xp_earned
    summary_resp = test_client.get(f"/api/quiz/{session_id}/summary")
    summary = summary_resp.json()
    assert summary["xp_earned"] > 0

    # XP should be persisted in the DB
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    with TestingSessionLocal() as db:
        user = db.query(User).filter(User.username == "quizuser").first()
        assert user is not None
        assert user.xp == summary["xp_earned"]
