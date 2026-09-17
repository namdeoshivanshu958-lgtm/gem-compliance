import pytest
from fastapi import status

def test_login_success(client):
    """Verify that valid credentials return a JWT access token."""
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@cpcl.gem", "password": "Admin@123"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 20

def test_login_invalid_password(client):
    """Verify that an incorrect password fails with 401."""
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@cpcl.gem", "password": "WrongPassword!99"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect email or password" in response.json()["detail"]

def test_login_nonexistent_user(client):
    """Verify that a nonexistent user fails with 401."""
    response = client.post(
        "/api/auth/login",
        json={"email": "ghost_user_9999@cpcl.gov.in", "password": "AnyPassword"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_rbac_admin_endpoint_forbidden_for_evaluator(client, evaluator_token):
    """Verify RBAC: Evaluator cannot access admin users list endpoint."""
    headers = {"Authorization": f"Bearer {evaluator_token}"}
    response = client.get("/api/users/", headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_rbac_admin_endpoint_forbidden_for_bidder(client, bidder_token):
    """Verify RBAC: Bidder cannot access officer compare endpoint."""
    headers = {"Authorization": f"Bearer {bidder_token}"}
    response = client.get("/api/officer/stats", headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_rbac_bidder_endpoint_allowed_for_bidder(client, bidder_token):
    """Verify Bidder role has access to my-applications endpoint."""
    headers = {"Authorization": f"Bearer {bidder_token}"}
    response = client.get("/api/bidders/my-applications", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert isinstance(response.json(), list)

def test_unauthenticated_request_fails(client):
    """Verify accessing protected endpoints without token returns 401."""
    response = client.get("/api/officer/stats")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
