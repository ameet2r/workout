from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.core.auth import get_current_user
from app.core.firebase import get_firestore_client
from app.schemas.workout_plan import WorkoutPlan, WorkoutPlanCreate, WorkoutPlanUpdate
from datetime import datetime

router = APIRouter()


@router.post("/", response_model=WorkoutPlan)
async def create_workout_plan(
    plan: WorkoutPlanCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new workout plan
    """
    db = get_firestore_client()
    plan_ref = db.collection("workout_plans").document()

    plan_data = plan.model_dump()
    plan_data["user_id"] = current_user["uid"]
    plan_data["created_at"] = datetime.now()
    plan_data["updated_at"] = datetime.now()

    plan_ref.set(plan_data)

    return {
        "id": plan_ref.id,
        **plan_data
    }


@router.get("/", response_model=List[WorkoutPlan])
async def list_workout_plans(current_user: dict = Depends(get_current_user)):
    """
    List all workout plans for the current user
    """
    db = get_firestore_client()
    # Exclude notes from list view to reduce bandwidth
    plans_ref = db.collection("workout_plans").where(
        "user_id", "==", current_user["uid"]
    ).select(["user_id", "name", "exercises", "created_at", "updated_at"])
    plans = plans_ref.stream()

    return [
        {
            "id": doc.id,
            **doc.to_dict()
        }
        for doc in plans
    ]


@router.get("/{plan_id}", response_model=WorkoutPlan)
async def get_workout_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get workout plan by ID
    """
    db = get_firestore_client()
    plan_ref = db.collection("workout_plans").document(plan_id)
    plan_doc = plan_ref.get()

    if not plan_doc.exists:
        raise HTTPException(status_code=404, detail="Workout plan not found")

    plan_data = plan_doc.to_dict()
    if plan_data["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this plan")

    return {
        "id": plan_id,
        **plan_data
    }


@router.patch("/{plan_id}", response_model=WorkoutPlan)
async def update_workout_plan(
    plan_id: str,
    plan_update: WorkoutPlanUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a workout plan
    """
    db = get_firestore_client()
    plan_ref = db.collection("workout_plans").document(plan_id)
    plan_doc = plan_ref.get()

    if not plan_doc.exists:
        raise HTTPException(status_code=404, detail="Workout plan not found")

    plan_data = plan_doc.to_dict()
    if plan_data["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this plan")

    update_data = plan_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now()

    plan_ref.update(update_data)

    updated_doc = plan_ref.get()
    return {
        "id": plan_id,
        **updated_doc.to_dict()
    }


@router.delete("/{plan_id}")
async def delete_workout_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a workout plan
    """
    db = get_firestore_client()
    plan_ref = db.collection("workout_plans").document(plan_id)
    plan_doc = plan_ref.get()

    if not plan_doc.exists:
        raise HTTPException(status_code=404, detail="Workout plan not found")

    plan_data = plan_doc.to_dict()
    if plan_data["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this plan")

    plan_ref.delete()

    return {"message": "Workout plan deleted successfully"}
