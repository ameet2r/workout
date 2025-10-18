from fastapi import APIRouter, HTTPException, Depends
from app.core.auth import get_current_user_with_app_check
from app.core.firebase import get_firestore_client
from app.schemas.user import User, UserUpdate
from datetime import datetime
from firebase_admin import auth

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


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_user_with_app_check)
):
    """
    Delete user account and all associated data
    """
    if user_id != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this account")

    db = get_firestore_client()

    try:
        # Delete all workout sessions and their subcollections
        sessions_ref = db.collection("workout_sessions").where("user_id", "==", user_id)
        sessions = sessions_ref.stream()

        for session in sessions:
            # Delete time_series subcollection
            time_series_ref = session.reference.collection("time_series")
            time_series_docs = time_series_ref.stream()
            for ts_doc in time_series_docs:
                ts_doc.reference.delete()

            # Delete the session document
            session.reference.delete()

        # Delete all workout plans
        plans_ref = db.collection("workout_plans").where("user_id", "==", user_id)
        plans = plans_ref.stream()
        for plan in plans:
            plan.reference.delete()

        # Delete all exercises created by user
        exercises_ref = db.collection("exercises").where("created_by", "==", user_id)
        exercises = exercises_ref.stream()
        for exercise in exercises:
            exercise.reference.delete()

        # Delete all exercise versions
        versions_ref = db.collection("exercise_versions").where("user_id", "==", user_id)
        versions = versions_ref.stream()
        for version in versions:
            version.reference.delete()

        # Delete all audit logs (if audit logging was enabled)
        audit_logs_ref = db.collection("audit_logs").where("user_id", "==", user_id)
        audit_logs = audit_logs_ref.stream()
        for log in audit_logs:
            log.reference.delete()

        # Delete user document
        user_ref = db.collection("users").document(user_id)
        user_ref.delete()

        # Delete Firebase Auth account
        auth.delete_user(user_id)

        return {"message": "Account successfully deleted"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")
