from fastapi import APIRouter, HTTPException, Depends
from app.core.auth import get_current_user_with_app_check
from app.core.firebase import get_firestore_client
from app.schemas.user import User, UserCreate, UserUpdate
from datetime import datetime

router = APIRouter()


@router.post("/register", response_model=User)
async def register_user(user_data: UserCreate, current_user: dict = Depends(get_current_user_with_app_check)):
    """
    Register a new user in Firestore after Firebase Auth signup
    """
    db = get_firestore_client()
    user_ref = db.collection("users").document(current_user["uid"])

    # Check if user already exists
    if user_ref.get().exists:
        raise HTTPException(status_code=400, detail="User already exists")

    user_doc = {
        "email": user_data.email,
        "display_name": user_data.display_name,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    }

    user_ref.set(user_doc)

    return {
        "uid": current_user["uid"],
        **user_doc
    }


@router.get("/me", response_model=User)
async def get_current_user_profile(current_user: dict = Depends(get_current_user_with_app_check)):
    """
    Get current user profile
    """
    db = get_firestore_client()
    user_ref = db.collection("users").document(current_user["uid"])
    user_doc = user_ref.get()

    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "uid": current_user["uid"],
        **user_doc.to_dict()
    }
