import firebase_admin
from firebase_admin import credentials, firestore, auth
from app.core.config import settings
from typing import Optional

_db: Optional[firestore.Client] = None


def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    if not firebase_admin._apps:
        cred = credentials.Certificate(settings.FIREBASE_PRIVATE_KEY_PATH)
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
