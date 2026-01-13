"""
Authentication utilities for admin endpoints.
"""
import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.core.config import settings

security = HTTPBasic()


def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify admin credentials using constant-time comparison."""
    correct_username = secrets.compare_digest(
        credentials.username.encode("utf8"),
        settings.ADMIN_USERNAME.encode("utf8")
    )
    correct_password = secrets.compare_digest(
        credentials.password.encode("utf8"),
        settings.ADMIN_PASSWORD.encode("utf8")
    )
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ogiltiga inloggningsuppgifter",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username
