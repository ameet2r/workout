from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.firebase import verify_firebase_token, verify_app_check_token
from typing import Optional

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify Firebase token and return current user info
    """
    try:
        token = credentials.credentials
        decoded_token = verify_firebase_token(token)
        return {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email"),
        }
    except Exception:
        # Don't expose internal error details to prevent information disclosure
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_with_app_check(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    x_firebase_appcheck: Optional[str] = Header(None)
) -> dict:
    """
    Verify both Firebase Auth token and App Check token, then return current user info
    """
    # Verify App Check token first
    if not x_firebase_appcheck:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="App Check token is required",
        )

    try:
        verify_app_check_token(x_firebase_appcheck)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired App Check token",
        )

    # Verify Firebase Auth token
    try:
        token = credentials.credentials
        decoded_token = verify_firebase_token(token)
        return {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email"),
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
