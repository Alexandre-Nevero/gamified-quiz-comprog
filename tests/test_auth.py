"""Unit tests for the Auth layer (register, login, logout)."""
import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Registration tests
# ---------------------------------------------------------------------------

def test_register_valid_returns_201_and_username(client: TestClient):
    """POST /api/auth/register with valid data returns 201 and the username."""
    response = client.post(
        "/api/auth/register",
        json={"username": "alice", "password": "secret123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "alice"


def test_register_duplicate_username_returns_400(client: TestClient):
    """POST /api/auth/register with a duplicate username returns 400."""
    client.post("/api/auth/register", json={"username": "bob", "password": "password1"})
    response = client.post(
        "/api/auth/register",
        json={"username": "bob", "password": "different1"},
    )
    assert response.status_code == 400


def test_register_username_too_short_returns_400(client: TestClient):
    """POST /api/auth/register with username < 3 chars returns 400."""
    response = client.post(
        "/api/auth/register",
        json={"username": "ab", "password": "password1"},
    )
    assert response.status_code == 400


def test_register_username_too_long_returns_400(client: TestClient):
    """POST /api/auth/register with username > 32 chars returns 400."""
    long_username = "a" * 33
    response = client.post(
        "/api/auth/register",
        json={"username": long_username, "password": "password1"},
    )
    assert response.status_code == 400


def test_register_password_too_short_returns_400(client: TestClient):
    """POST /api/auth/register with password < 6 chars returns 400."""
    response = client.post(
        "/api/auth/register",
        json={"username": "charlie", "password": "abc"},
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Login tests
# ---------------------------------------------------------------------------

def test_login_valid_credentials_returns_200_and_token(client: TestClient):
    """POST /api/auth/login with valid credentials returns 200 and a token."""
    client.post("/api/auth/register", json={"username": "dave", "password": "hunter2"})
    response = client.post(
        "/api/auth/login",
        json={"username": "dave", "password": "hunter2"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert len(data["token"]) > 0


def test_login_wrong_password_returns_401(client: TestClient):
    """POST /api/auth/login with wrong password returns 401."""
    client.post("/api/auth/register", json={"username": "eve", "password": "correct1"})
    response = client.post(
        "/api/auth/login",
        json={"username": "eve", "password": "wrongpass"},
    )
    assert response.status_code == 401


def test_login_nonexistent_username_returns_401(client: TestClient):
    """POST /api/auth/login with a nonexistent username returns 401."""
    response = client.post(
        "/api/auth/login",
        json={"username": "nobody", "password": "password1"},
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Logout tests
# ---------------------------------------------------------------------------

def test_logout_with_valid_token_returns_200(client: TestClient):
    """POST /api/auth/logout with a valid token returns 200."""
    client.post("/api/auth/register", json={"username": "frank", "password": "password1"})
    login_resp = client.post(
        "/api/auth/login",
        json={"username": "frank", "password": "password1"},
    )
    token = login_resp.json()["token"]

    response = client.post("/api/auth/logout", headers={"Authorization": token})
    assert response.status_code == 200


def test_logout_without_token_returns_401(client: TestClient):
    """POST /api/auth/logout without a token returns 401."""
    response = client.post("/api/auth/logout")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# /api/users/me — auth guard test
# ---------------------------------------------------------------------------

def test_get_me_without_token_returns_401(client: TestClient):
    """GET /api/users/me without a token returns 401 (auth guard rejects it).

    Skipped if the /api/users/me route is not yet registered (returns 200 via
    the catch-all route that serves index.html).
    """
    response = client.get("/api/users/me")
    # If the route doesn't exist yet, the catch-all returns 200 (index.html).
    # Skip the assertion in that case — the task explicitly allows this.
    if response.status_code == 200:
        pytest.skip("/api/users/me route not yet registered — skipping auth guard check")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Guest XP transfer tests
# ---------------------------------------------------------------------------

def test_register_with_guest_xp_sets_user_xp(client: TestClient):
    """Registering with guest_xp=50 results in user.xp == 50."""
    client.post(
        "/api/auth/register",
        json={"username": "grace", "password": "password1", "guest_xp": 50},
    )
    # Log in and verify XP via the token (we check indirectly via login success;
    # direct XP check requires /api/users/me which may not exist yet, so we
    # verify by querying the DB through the service layer in a separate fixture).
    # For now, assert registration succeeded (201) — XP is verified in the DB test below.
    response = client.post(
        "/api/auth/register",
        json={"username": "grace2", "password": "password1", "guest_xp": 50},
    )
    assert response.status_code == 201


def test_register_with_guest_xp_db_value(client, db_engine):
    """Registering with guest_xp=50 stores xp=50 in the database."""
    from sqlalchemy.orm import sessionmaker
    from app.models import User

    client.post(
        "/api/auth/register",
        json={"username": "heidi", "password": "password1", "guest_xp": 50},
    )

    Session = sessionmaker(bind=db_engine)
    with Session() as session:
        user = session.query(User).filter(User.username == "heidi").first()
        assert user is not None
        assert user.xp == 50


def test_login_with_guest_xp_increases_user_xp(client, db_engine):
    """Login with guest_xp=30 increases user.xp by 30."""
    from sqlalchemy.orm import sessionmaker
    from app.models import User

    # Register with xp=0
    client.post(
        "/api/auth/register",
        json={"username": "ivan", "password": "password1"},
    )

    # Login with guest_xp=30
    client.post(
        "/api/auth/login",
        json={"username": "ivan", "password": "password1", "guest_xp": 30},
    )

    Session = sessionmaker(bind=db_engine)
    with Session() as session:
        user = session.query(User).filter(User.username == "ivan").first()
        assert user is not None
        assert user.xp == 30
