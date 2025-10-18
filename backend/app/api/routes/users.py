from fastapi import APIRouter, HTTPException, Depends
from app.core.auth import get_current_user_with_app_check
from app.core.firebase import get_firestore_client
from app.schemas.user import User, UserUpdate
from datetime import datetime

router = APIRouter()


@router.get("/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: dict = Depends(get_current_user_with_app_check)):
    """
    Get user by ID (only own profile for now)
    """
    if user_id != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this profile")

    db = get_firestore_client()
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()

    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "uid": user_id,
        **user_doc.to_dict()
    }


@router.patch("/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user_with_app_check)
):
    """
    Update user profile
    """
    if user_id != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this profile")

    db = get_firestore_client()
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()

    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now()

    user_ref.update(update_data)

    updated_doc = user_ref.get()
    return {
        "uid": user_id,
        **updated_doc.to_dict()
    }
