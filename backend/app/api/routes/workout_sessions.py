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
    start_time = datetime.now()
    session_data["start_time"] = start_time
    session_data["end_time"] = None

    session_ref.set(session_data)

    return {
        "id": session_ref.id,
        **session_data,
        "start_time": start_time.isoformat()
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
    ).limit(limit)
    sessions = sessions_ref.stream()

    result = []
    for doc in sessions:
        session_data = doc.to_dict()
        # Convert Firestore timestamps to ISO format strings
        if "start_time" in session_data and session_data["start_time"]:
            session_data["start_time"] = session_data["start_time"].isoformat() if hasattr(session_data["start_time"], "isoformat") else session_data["start_time"]
        if "end_time" in session_data and session_data["end_time"]:
            session_data["end_time"] = session_data["end_time"].isoformat() if hasattr(session_data["end_time"], "isoformat") else session_data["end_time"]

        result.append({
            "id": doc.id,
            **session_data
        })

    # Sort by start_time in descending order (most recent first)
    result.sort(key=lambda x: x.get("start_time", ""), reverse=True)

    return result


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

    # Convert Firestore timestamps to ISO format strings
    if "start_time" in session_data and session_data["start_time"]:
        session_data["start_time"] = session_data["start_time"].isoformat() if hasattr(session_data["start_time"], "isoformat") else session_data["start_time"]
    if "end_time" in session_data and session_data["end_time"]:
        session_data["end_time"] = session_data["end_time"].isoformat() if hasattr(session_data["end_time"], "isoformat") else session_data["end_time"]

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
    updated_data = updated_doc.to_dict()

    # Convert Firestore timestamps to ISO format strings
    if "start_time" in updated_data and updated_data["start_time"]:
        updated_data["start_time"] = updated_data["start_time"].isoformat() if hasattr(updated_data["start_time"], "isoformat") else updated_data["start_time"]
    if "end_time" in updated_data and updated_data["end_time"]:
        updated_data["end_time"] = updated_data["end_time"].isoformat() if hasattr(updated_data["end_time"], "isoformat") else updated_data["end_time"]

    return {
        "id": session_id,
        **updated_data
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
    updated_data = updated_doc.to_dict()

    # Convert Firestore timestamps to ISO format strings
    if "start_time" in updated_data and updated_data["start_time"]:
        updated_data["start_time"] = updated_data["start_time"].isoformat() if hasattr(updated_data["start_time"], "isoformat") else updated_data["start_time"]
    if "end_time" in updated_data and updated_data["end_time"]:
        updated_data["end_time"] = updated_data["end_time"].isoformat() if hasattr(updated_data["end_time"], "isoformat") else updated_data["end_time"]

    return {
        "id": session_id,
        **updated_data
    }


@router.delete("/{session_id}")
async def delete_workout_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a workout session
    """
    db = get_firestore_client()
    session_ref = db.collection("workout_sessions").document(session_id)
    session_doc = session_ref.get()

    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="Workout session not found")

    session_data = session_doc.to_dict()
    if session_data["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")

    session_ref.delete()

    return {"message": "Workout session deleted successfully"}


@router.get("/exercise-history/{exercise_version_id}")
async def get_exercise_history(
    exercise_version_id: str,
    limit: int = 5,
    current_user: dict = Depends(get_current_user)
):
    """
    Get workout history for a specific exercise version including 1RM calculations
    """
    db = get_firestore_client()

    # Get all sessions for the user
    sessions_ref = db.collection("workout_sessions").where(
        "user_id", "==", current_user["uid"]
    ).limit(10)  # Get last 10 sessions to search through

    sessions = sessions_ref.stream()

    exercise_sessions = []
    max_weight = 0
    estimated_1rm = 0
    actual_1rm = None

    for doc in sessions:
        session_data = doc.to_dict()

        # Skip if session is not completed (no end_time)
        if not session_data.get("end_time"):
            continue

        # Check if this session has the exercise
        if "exercises" in session_data and session_data["exercises"]:
            for exercise in session_data["exercises"]:
                if exercise.get("exercise_version_id") == exercise_version_id:
                    # Convert timestamp
                    date = session_data.get("start_time")
                    if date and hasattr(date, "isoformat"):
                        date = date.isoformat()

                    sets = exercise.get("sets", [])

                    # Skip this session if no sets were logged
                    if not sets or len(sets) == 0:
                        continue

                    # Calculate stats from sets
                    for set_data in sets:
                        weight = set_data.get("weight", 0) or 0
                        reps = set_data.get("reps", 0) or 0

                        if weight > 0:
                            # Track max weight
                            if weight > max_weight:
                                max_weight = weight

                            # Track actual 1RM (1 rep sets)
                            if reps == 1:
                                if actual_1rm is None or weight > actual_1rm:
                                    actual_1rm = weight

                            # Calculate estimated 1RM using Epley formula: 1RM = weight × (1 + reps/30)
                            if reps > 0:
                                calculated_1rm = weight * (1 + reps / 30)
                                if calculated_1rm > estimated_1rm:
                                    estimated_1rm = calculated_1rm

                    exercise_sessions.append({
                        "date": date,
                        "sets": sets
                    })
                    break

    # Sort by date descending and limit
    exercise_sessions.sort(key=lambda x: x.get("date", ""), reverse=True)

    return {
        "sessions": exercise_sessions[:limit],
        "estimated_1rm": round(estimated_1rm, 1) if estimated_1rm > 0 else None,
        "actual_1rm": round(actual_1rm, 1) if actual_1rm else None
    }
