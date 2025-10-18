from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List
from app.core.auth import get_current_user_with_app_check
from app.core.firebase import get_firestore_client
from app.schemas.exercise import Exercise, ExerciseCreate, ExerciseUpdate, ExerciseVersion, ExerciseVersionCreate
from app.utils.validation import sanitize_text_field, sanitize_html
from app.utils.audit_log import log_data_modification, log_data_access
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=Exercise)
async def create_exercise(
    exercise: ExerciseCreate,
    request: Request,
    current_user: dict = Depends(get_current_user_with_app_check)
):
    """
    Create a new exercise (global exercise library)
    """
    # Sanitize text fields
    exercise.name = sanitize_text_field(exercise.name, "Exercise name")
    if exercise.equipment:
        exercise.equipment = sanitize_text_field(exercise.equipment, "Equipment")
    if exercise.description:
        exercise.description = sanitize_html(exercise.description)

    # Sanitize muscle groups
    exercise.muscle_groups = [
        sanitize_text_field(mg, "Muscle group") for mg in exercise.muscle_groups
    ]

    db = get_firestore_client()
    exercise_ref = db.collection("exercises").document()

    exercise_data = exercise.model_dump()
    exercise_data["created_by"] = current_user["uid"]
    exercise_data["created_at"] = datetime.now()
    exercise_data["updated_at"] = datetime.now()

    exercise_ref.set(exercise_data)

    # Audit log
    log_data_modification(
        user_id=current_user["uid"],
        resource_type="exercise",
        resource_id=exercise_ref.id,
        action="CREATE",
        details={"name": exercise.name},
        ip_address=request.client.host if request.client else None
    )

    return {
        "id": exercise_ref.id,
        **exercise_data
    }


@router.get("/", response_model=List[Exercise])
async def list_exercises(current_user: dict = Depends(get_current_user_with_app_check)):
    """
    List all exercises created by the current user
    """
    db = get_firestore_client()
    # Only return exercises created by the current user
    exercises_ref = db.collection("exercises").where(
        "created_by", "==", current_user["uid"]
    )
    exercises = exercises_ref.stream()

    return [
        {
            "id": doc.id,
            **doc.to_dict()
        }
        for doc in exercises
    ]


@router.get("/{exercise_id}", response_model=Exercise)
async def get_exercise(exercise_id: str, current_user: dict = Depends(get_current_user_with_app_check)):
    """
    Get exercise by ID
    """
    db = get_firestore_client()
    exercise_ref = db.collection("exercises").document(exercise_id)
    exercise_doc = exercise_ref.get()

    if not exercise_doc.exists:
        raise HTTPException(status_code=404, detail="Exercise not found")

    return {
        "id": exercise_id,
        **exercise_doc.to_dict()
    }


@router.patch("/{exercise_id}", response_model=Exercise)
async def update_exercise(
    exercise_id: str,
    exercise_update: ExerciseUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user_with_app_check)
):
    """
    Update an exercise by ID (only creator can update)
    """
    db = get_firestore_client()
    exercise_ref = db.collection("exercises").document(exercise_id)
    exercise_doc = exercise_ref.get()

    if not exercise_doc.exists:
        raise HTTPException(status_code=404, detail="Exercise not found")

    # Authorization check: only creator can update
    exercise_data = exercise_doc.to_dict()
    if exercise_data.get("created_by") != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this exercise")

    # Sanitize text fields if provided
    update_data = exercise_update.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"]:
        update_data["name"] = sanitize_text_field(update_data["name"], "Exercise name")
    if "equipment" in update_data and update_data["equipment"]:
        update_data["equipment"] = sanitize_text_field(update_data["equipment"], "Equipment")
    if "description" in update_data and update_data["description"]:
        update_data["description"] = sanitize_html(update_data["description"])
    if "muscle_groups" in update_data and update_data["muscle_groups"]:
        update_data["muscle_groups"] = [
            sanitize_text_field(mg, "Muscle group") for mg in update_data["muscle_groups"]
        ]

    if update_data:
        update_data["updated_at"] = datetime.now()
        exercise_ref.update(update_data)

        # Audit log
        log_data_modification(
            user_id=current_user["uid"],
            resource_type="exercise",
            resource_id=exercise_id,
            action="UPDATE",
            details={"fields_updated": list(update_data.keys())},
            ip_address=request.client.host if request.client else None
        )

    # Get updated document
    updated_doc = exercise_ref.get()
    return {
        "id": exercise_id,
        **updated_doc.to_dict()
    }


# Exercise Versions endpoints
@router.post("/versions", response_model=ExerciseVersion)
async def create_exercise_version(
    version: ExerciseVersionCreate,
    request: Request,
    current_user: dict = Depends(get_current_user_with_app_check)
):
    """
    Create a new exercise version for the current user
    """
    # Sanitize text fields
    version.version_name = sanitize_text_field(version.version_name, "Version name")
    if version.notes:
        version.notes = sanitize_html(version.notes)

    # Verify that the exercise exists
    db = get_firestore_client()
    exercise_ref = db.collection("exercises").document(version.exercise_id)
    exercise_doc = exercise_ref.get()

    if not exercise_doc.exists:
        raise HTTPException(status_code=404, detail="Exercise not found")

    version_ref = db.collection("exercise_versions").document()

    version_data = version.model_dump()
    version_data["user_id"] = current_user["uid"]
    version_data["created_at"] = datetime.now()
    version_data["updated_at"] = datetime.now()

    version_ref.set(version_data)

    # Audit log
    log_data_modification(
        user_id=current_user["uid"],
        resource_type="exercise_version",
        resource_id=version_ref.id,
        action="CREATE",
        details={"exercise_id": version.exercise_id, "version_name": version.version_name},
        ip_address=request.client.host if request.client else None
    )

    return {
        "id": version_ref.id,
        **version_data
    }


@router.get("/versions/my-versions", response_model=List[ExerciseVersion])
async def list_my_exercise_versions(current_user: dict = Depends(get_current_user_with_app_check)):
    """
    List all exercise versions for the current user
    """
    db = get_firestore_client()
    versions_ref = db.collection("exercise_versions").where("user_id", "==", current_user["uid"])
    versions = versions_ref.stream()

    return [
        {
            "id": doc.id,
            **doc.to_dict()
        }
        for doc in versions
    ]


@router.get("/{exercise_id}/versions", response_model=List[ExerciseVersion])
async def list_exercise_versions(exercise_id: str, current_user: dict = Depends(get_current_user_with_app_check)):
    """
    List all versions of a specific exercise for the current user
    """
    db = get_firestore_client()
    versions_ref = db.collection("exercise_versions").where(
        "exercise_id", "==", exercise_id
    ).where(
        "user_id", "==", current_user["uid"]
    )
    versions = versions_ref.stream()

    return [
        {
            "id": doc.id,
            **doc.to_dict()
        }
        for doc in versions
    ]


@router.delete("/{exercise_id}")
async def delete_exercise(
    exercise_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_with_app_check)
):
    """
    Delete an exercise (only if not used in any workout plans)
    """
    db = get_firestore_client()
    exercise_ref = db.collection("exercises").document(exercise_id)
    exercise_doc = exercise_ref.get()

    if not exercise_doc.exists:
        raise HTTPException(status_code=404, detail="Exercise not found")

    # Authorization check: only creator can delete
    exercise_data = exercise_doc.to_dict()
    if exercise_data.get("created_by") != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this exercise")

    # Check if exercise is used in any workout plans
    # First, get all exercise versions for this exercise
    exercise_versions_ref = db.collection("exercise_versions").where(
        "exercise_id", "==", exercise_id
    )
    exercise_versions = list(exercise_versions_ref.stream())
    exercise_version_ids = [version.id for version in exercise_versions]

    # Check if any of these versions are used in workout plans
    if exercise_version_ids:
        plans_ref = db.collection("workout_plans").where(
            "user_id", "==", current_user["uid"]
        )
        plans = plans_ref.stream()

        for plan_doc in plans:
            plan_data = plan_doc.to_dict()
            exercises_in_plan = plan_data.get("exercises", [])
            for exercise in exercises_in_plan:
                if exercise.get("exercise_version_id") in exercise_version_ids:
                    raise HTTPException(
                        status_code=409,
                        detail="Cannot delete exercise: it is used in one or more workout plans"
                    )

    # Delete the exercise
    exercise_ref.delete()

    # Audit log
    log_data_modification(
        user_id=current_user["uid"],
        resource_type="exercise",
        resource_id=exercise_id,
        action="DELETE",
        details={"name": exercise_data.get("name")},
        ip_address=request.client.host if request.client else None
    )

    return {"message": "Exercise deleted successfully"}
