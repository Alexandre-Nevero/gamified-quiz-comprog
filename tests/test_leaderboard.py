"""Unit tests for the Leaderboard endpoint (GET /api/leaderboard)."""
import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Basic access tests (no auth required)
# ---------------------------------------------------------------------------

def test_leaderboard_returns_200_without_token(client: TestClient):
    """GET /api/leaderboard returns HTTP 200 without any authentication token."""
    response = client.get("/api/leaderboard")
    assert response.status_code == 200


def test_leaderboard_returns_list(client: TestClient):
    """GET /api/leaderboard returns a list (possibly empty)."""
    response = client.get("/api/leaderboard")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


# ---------------------------------------------------------------------------
# Ordering tests
# ---------------------------------------------------------------------------

def test_leaderboard_ordered_by_xp_descending(client: TestClient):
    """GET /api/leaderboard with users in DB returns them ordered by XP descending."""
    # Register three users with different XP via the quiz API is complex,
    # so we register them and use the guest_xp parameter on login to set XP.
    client.post("/api/auth/register", json={"username": "low_xp", "password": "password1"})
    client.post("/api/auth/register", json={"username": "mid_xp", "password": "password1"})
    client.post("/api/auth/register", json={"username": "high_xp", "password": "password1"})

    # Use login with guest_xp to add XP to each user
    client.post("/api/auth/login", json={"username": "low_xp", "password": "password1", "guest_xp": 10})
    client.post("/api/auth/login", json={"username": "mid_xp", "password": "password1", "guest_xp": 50})
    client.post("/api/auth/login", json={"username": "high_xp", "password": "password1", "guest_xp": 100})

    response = client.get("/api/leaderboard")
    assert response.status_code == 200
    data = response.json()

    assert len(data) == 3

    # Verify descending XP order
    xp_values = [entry["xp"] for entry in data]
    assert xp_values == sorted(xp_values, reverse=True)

    # Verify the highest XP user is first
    assert data[0]["username"] == "high_xp"
    assert data[0]["xp"] == 100


# ---------------------------------------------------------------------------
# Top-10 cap test
# ---------------------------------------------------------------------------

def test_leaderboard_returns_at_most_10_users(client: TestClient):
    """GET /api/leaderboard with more than 10 users returns at most 10."""
    # Register 15 users
    for i in range(15):
        client.post(
            "/api/auth/register",
            json={"username": f"user{i:02d}", "password": "password1"},
        )

    response = client.get("/api/leaderboard")
    assert response.status_code == 200
    data = response.json()

    assert len(data) <= 10
