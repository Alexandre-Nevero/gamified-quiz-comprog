"""Unit tests for the Users endpoint (GET /api/users/me)."""
import pytest
from fastapi.testclient import TestClient


def test_get_me_without_token_returns_401(client: TestClient):
    """GET /api/users/me without a token returns HTTP 401."""
    response = client.get("/api/users/me")
    assert response.status_code == 401


def test_get_me_with_valid_token_returns_200_with_user_data(client: TestClient):
    """GET /api/users/me with a valid token returns 200 with username, xp, and level."""
    # Register and log in to obtain a token
    client.post("/api/auth/register", json={"username": "testuser", "password": "password1"})
    login_resp = client.post("/api/auth/login", json={"username": "testuser", "password": "password1"})
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]

    response = client.get("/api/users/me", headers={"Authorization": token})
    assert response.status_code == 200

    data = response.json()
    assert "username" in data
    assert "xp" in data
    assert "level" in data
    assert data["username"] == "testuser"
    assert isinstance(data["xp"], int)
    assert isinstance(data["level"], int)
