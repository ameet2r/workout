from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.core.auth import get_current_user
from app.core.firebase import get_firestore_client
from app.schemas.exercise import Exercise, ExerciseCreate, ExerciseUpdate, ExerciseVersion, ExerciseVersionCreate
from datetime import datetime

router = APIRouter()


@router.post("/", response_model=Exercise)
async def create_exercise(exercise: ExerciseCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new exercise (global exercise library)
    """
    db = get_firestore_client()
    exercise_ref = db.collection("exercises").document()

    exercise_data = exercise.model_dump()
    exercise_data["created_at"] = datetime.now()
    exercise_data["updated_at"] = datetime.now()

    exercise_ref.set(exercise_data)

    return {
        "id": exercise_ref.id,
        **exercise_data
    }


@router.get("/", response_model=List[Exercise])
async def list_exercises(current_user: dict = Depends(get_current_user)):
    """
    List all exercises
    """
    db = get_firestore_client()
    exercises_ref = db.collection("exercises")
    exercises = exercises_ref.stream()

    return [
        {
            "id": doc.id,
            **doc.to_dict()
        }
        for doc in exercises
    ]


@router.get("/{exercise_id}", response_model=Exercise)
async def get_exercise(exercise_id: str, current_user: dict = Depends(get_current_user)):
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
    current_user: dict = Depends(get_current_user)
):
    """
    Update an exercise by ID
    """
    db = get_firestore_client()
    exercise_ref = db.collection("exercises").document(exercise_id)
    exercise_doc = exercise_ref.get()

    if not exercise_doc.exists:
        raise HTTPException(status_code=404, detail="Exercise not found")

    # Only update fields that were provided
    update_data = exercise_update.model_dump(exclude_unset=True)

    if update_data:
        update_data["updated_at"] = datetime.now()
        exercise_ref.update(update_data)

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
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new exercise version for the current user
    """
    db = get_firestore_client()
    version_ref = db.collection("exercise_versions").document()

    version_data = version.model_dump()
    version_data["user_id"] = current_user["uid"]
    version_data["created_at"] = datetime.now()
    version_data["updated_at"] = datetime.now()

    version_ref.set(version_data)

    return {
        "id": version_ref.id,
        **version_data
    }


@router.get("/versions/my-versions", response_model=List[ExerciseVersion])
async def list_my_exercise_versions(current_user: dict = Depends(get_current_user)):
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
async def list_exercise_versions(exercise_id: str, current_user: dict = Depends(get_current_user)):
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
