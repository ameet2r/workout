import firebase_admin
from firebase_admin import credentials, firestore, auth
from app.core.config import settings
from typing import Optional
import json
import os

_db: Optional[firestore.Client] = None


def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    if not firebase_admin._apps:
        # Handle both file path and JSON string for credentials
        firebase_key = settings.FIREBASE_PRIVATE_KEY_PATH

        # Check if it's a file path that exists
        if os.path.isfile(firebase_key):
            cred = credentials.Certificate(firebase_key)
        else:
            # Try to parse as JSON string (for Railway/cloud deployments)
            try:
                service_account_info = json.loads(firebase_key)
                cred = credentials.Certificate(service_account_info)
            except json.JSONDecodeError:
                raise ValueError("FIREBASE_PRIVATE_KEY_PATH must be either a valid file path or a JSON string")

        firebase_admin.initialize_app(cred, {
            'projectId': settings.FIREBASE_PROJECT_ID,
        })


def get_firestore_client() -> firestore.Client:
    """Get Firestore client instance"""
    global _db
    if _db is None:
        initialize_firebase()
        _db = firestore.client()
    return _db


def verify_firebase_token(token: str) -> dict:
    """Verify Firebase ID token and return decoded token"""
    try:
        initialize_firebase()
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise ValueError(f"Invalid token: {str(e)}")


def verify_app_check_token(token: str) -> dict:
    """Verify Firebase App Check token and return decoded token"""
    try:
        initialize_firebase()
        from firebase_admin import app_check
        decoded_token = app_check.verify_token(token)
        return decoded_token
    except Exception as e:
        raise ValueError(f"Invalid App Check token: {str(e)}")
