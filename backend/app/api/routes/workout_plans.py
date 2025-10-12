from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List
from app.core.auth import get_current_user
from app.core.firebase import get_firestore_client
from app.schemas.workout_plan import WorkoutPlan, WorkoutPlanCreate, WorkoutPlanUpdate
from app.utils.validation import sanitize_text_field, sanitize_html
from app.utils.audit_log import log_data_modification
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=WorkoutPlan)
async def create_workout_plan(
    plan: WorkoutPlanCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new workout plan with validation
    """
    # Sanitize text fields
    plan.name = sanitize_text_field(plan.name, "Plan name")
    if plan.notes:
        plan.notes = sanitize_html(plan.notes)

    db = get_firestore_client()

    # Validate all exercise_version_ids exist and belong to user
    for exercise in plan.exercises:
        version_ref = db.collection("exercise_versions").document(
            exercise.exercise_version_id
        )
        version_doc = version_ref.get()

        if not version_doc.exists:
            raise HTTPException(
                status_code=400,
                detail=f"Exercise version {exercise.exercise_version_id} not found"
            )

        version_data = version_doc.to_dict()
        if version_data["user_id"] != current_user["uid"]:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to use this exercise version"
            )

        # Sanitize instruction field if present
        if exercise.instruction:
            exercise.instruction = sanitize_html(exercise.instruction)

    plan_ref = db.collection("workout_plans").document()

    plan_data = plan.model_dump()
    plan_data["user_id"] = current_user["uid"]
    plan_data["created_at"] = datetime.now()
    plan_data["updated_at"] = datetime.now()

    plan_ref.set(plan_data)

    # Audit log
    log_data_modification(
        user_id=current_user["uid"],
        resource_type="workout_plan",
        resource_id=plan_ref.id,
        action="CREATE",
        details={"name": plan.name, "exercises_count": len(plan.exercises)},
        ip_address=request.client.host if request.client else None
    )

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
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a workout plan with validation
    """
    db = get_firestore_client()
    plan_ref = db.collection("workout_plans").document(plan_id)
    plan_doc = plan_ref.get()

    if not plan_doc.exists:
        raise HTTPException(status_code=404, detail="Workout plan not found")

    plan_data = plan_doc.to_dict()
    if plan_data["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this plan")

    # Sanitize text fields if provided
    if plan_update.name:
        plan_update.name = sanitize_text_field(plan_update.name, "Plan name")
    if plan_update.notes:
        plan_update.notes = sanitize_html(plan_update.notes)

    # Validate exercise_version_ids if exercises are being updated
    if plan_update.exercises:
        for exercise in plan_update.exercises:
            version_ref = db.collection("exercise_versions").document(
                exercise.exercise_version_id
            )
            version_doc = version_ref.get()

            if not version_doc.exists:
                raise HTTPException(
                    status_code=400,
                    detail=f"Exercise version {exercise.exercise_version_id} not found"
                )

            version_data = version_doc.to_dict()
            if version_data["user_id"] != current_user["uid"]:
                raise HTTPException(
                    status_code=403,
                    detail="Not authorized to use this exercise version"
                )

            # Sanitize instruction field if present
            if exercise.instruction:
                exercise.instruction = sanitize_html(exercise.instruction)

    # Convert to dict after validation and sanitization
    update_data = plan_update.model_dump(exclude_unset=True)

    update_data["updated_at"] = datetime.now()
    plan_ref.update(update_data)

    # Audit log
    log_data_modification(
        user_id=current_user["uid"],
        resource_type="workout_plan",
        resource_id=plan_id,
        action="UPDATE",
        details={"fields_updated": list(update_data.keys())},
        ip_address=request.client.host if request.client else None
    )

    updated_doc = plan_ref.get()
    return {
        "id": plan_id,
        **updated_doc.to_dict()
    }


@router.delete("/{plan_id}")
async def delete_workout_plan(
    plan_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
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

    # Audit log
    log_data_modification(
        user_id=current_user["uid"],
        resource_type="workout_plan",
        resource_id=plan_id,
        action="DELETE",
        details={"name": plan_data.get("name")},
        ip_address=request.client.host if request.client else None
    )

    return {"message": "Workout plan deleted successfully"}
