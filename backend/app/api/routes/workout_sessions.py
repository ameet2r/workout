from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.core.auth import get_current_user
from app.core.firebase import get_firestore_client
from app.schemas.workout_session import WorkoutSession, WorkoutSessionCreate, WorkoutSessionUpdate
from datetime import datetime

router = APIRouter()


@router.post("/", response_model=WorkoutSession)
async def create_workout_session(
    session: WorkoutSessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Start a new workout session
    """
    db = get_firestore_client()
    session_ref = db.collection("workout_sessions").document()

    session_data = session.model_dump()
    session_data["user_id"] = current_user["uid"]
    session_data["start_time"] = datetime.now()
    session_data["end_time"] = None

    session_ref.set(session_data)

    return {
        "id": session_ref.id,
        **session_data
    }


@router.get("/", response_model=List[WorkoutSession])
async def list_workout_sessions(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """
    List workout sessions for the current user
    """
    db = get_firestore_client()
    sessions_ref = db.collection("workout_sessions").where(
        "user_id", "==", current_user["uid"]
    ).order_by("start_time", direction="DESCENDING").limit(limit)
    sessions = sessions_ref.stream()

    return [
        {
            "id": doc.id,
            **doc.to_dict()
        }
        for doc in sessions
    ]


@router.get("/{session_id}", response_model=WorkoutSession)
async def get_workout_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get workout session by ID
    """
    db = get_firestore_client()
    session_ref = db.collection("workout_sessions").document(session_id)
    session_doc = session_ref.get()

    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="Workout session not found")

    session_data = session_doc.to_dict()
    if session_data["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this session")

    return {
        "id": session_id,
        **session_data
    }


@router.patch("/{session_id}", response_model=WorkoutSession)
async def update_workout_session(
    session_id: str,
    session_update: WorkoutSessionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a workout session (add sets, complete workout, add Garmin data)
    """
    db = get_firestore_client()
    session_ref = db.collection("workout_sessions").document(session_id)
    session_doc = session_ref.get()

    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="Workout session not found")

    session_data = session_doc.to_dict()
    if session_data["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this session")

    update_data = session_update.model_dump(exclude_unset=True)

    session_ref.update(update_data)

    updated_doc = session_ref.get()
    return {
        "id": session_id,
        **updated_doc.to_dict()
    }


@router.post("/{session_id}/complete", response_model=WorkoutSession)
async def complete_workout_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a workout session as complete
    """
    db = get_firestore_client()
    session_ref = db.collection("workout_sessions").document(session_id)
    session_doc = session_ref.get()

    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="Workout session not found")

    session_data = session_doc.to_dict()
    if session_data["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to complete this session")

    session_ref.update({"end_time": datetime.now()})

    updated_doc = session_ref.get()
    return {
        "id": session_id,
        **updated_doc.to_dict()
    }
