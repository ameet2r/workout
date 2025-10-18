from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.core.auth import get_current_user_with_app_check
from app.core.firebase import get_firestore_client
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/progress/{exercise_version_id}")
async def get_exercise_progress(
    exercise_version_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_with_app_check)
):
    """
    Get progress for a specific exercise version over time
    Returns max weight, total volume, etc. for each workout session
    """
    db = get_firestore_client()

    # Build query - only select fields we need to reduce bandwidth
    sessions_query = db.collection("workout_sessions").where(
        "user_id", "==", current_user["uid"]
    ).select(["user_id", "start_time", "exercises"])

    # Add date filters if provided
    if start_date:
        start_dt = datetime.fromisoformat(start_date)
        sessions_query = sessions_query.where("start_time", ">=", start_dt)

    if end_date:
        end_dt = datetime.fromisoformat(end_date)
        sessions_query = sessions_query.where("start_time", "<=", end_dt)

    sessions_query = sessions_query.order_by("start_time")
    sessions = sessions_query.stream()

    progress_data = []

    # NOTE: Firestore limitation - Cannot query nested array fields (exercises[].exercise_version_id)
    # Therefore, we must fetch all user sessions and filter in application code.
    # This is acceptable for typical user data volumes (<1000 sessions), but may need
    # optimization if users have significantly more sessions:
    # - Consider denormalizing exercise data into separate collection
    # - Add pagination/caching if performance degrades
    # - Monitor query performance and add limits if needed
    for session_doc in sessions:
        session_data = session_doc.to_dict()

        # Find the exercise in the session
        for exercise in session_data.get("exercises", []):
            if exercise["exercise_version_id"] == exercise_version_id:
                sets = exercise.get("sets", [])

                if sets:
                    max_weight = max(s.get("weight", 0) for s in sets)
                    total_reps = sum(s.get("reps", 0) for s in sets)
                    total_volume = sum(s.get("weight", 0) * s.get("reps", 0) for s in sets)

                    progress_data.append({
                        "session_id": session_doc.id,
                        "date": session_data["start_time"],
                        "max_weight": max_weight,
                        "total_reps": total_reps,
                        "total_volume": total_volume,
                        "sets_count": len(sets)
                    })

    return progress_data


@router.get("/records/{exercise_version_id}")
async def get_personal_records(
    exercise_version_id: str,
    current_user: dict = Depends(get_current_user_with_app_check)
):
    """
    Get personal records for a specific exercise version
    """
    db = get_firestore_client()

    # Only select fields we need to reduce bandwidth
    sessions_query = db.collection("workout_sessions").where(
        "user_id", "==", current_user["uid"]
    ).select(["user_id", "start_time", "exercises"]).order_by("start_time")

    sessions = sessions_query.stream()

    max_weight_pr = {"weight": 0, "reps": 0, "date": None}
    max_volume_pr = {"volume": 0, "date": None}
    max_reps_pr = {"reps": 0, "weight": 0, "date": None}

    # NOTE: Same Firestore limitation as above - cannot query nested arrays efficiently
    for session_doc in sessions:
        session_data = session_doc.to_dict()

        for exercise in session_data.get("exercises", []):
            if exercise["exercise_version_id"] == exercise_version_id:
                sets = exercise.get("sets", [])

                for set_data in sets:
                    weight = set_data.get("weight", 0)
                    reps = set_data.get("reps", 0)
                    volume = weight * reps
                    date = session_data["start_time"]

                    # Check for max weight PR
                    if weight > max_weight_pr["weight"]:
                        max_weight_pr = {"weight": weight, "reps": reps, "date": date}

                    # Check for max reps PR (at same or higher weight)
                    if reps > max_reps_pr["reps"]:
                        max_reps_pr = {"reps": reps, "weight": weight, "date": date}

                # Check for max volume PR (per session)
                total_volume = sum(s.get("weight", 0) * s.get("reps", 0) for s in sets)
                if total_volume > max_volume_pr["volume"]:
                    max_volume_pr = {"volume": total_volume, "date": date}

    return {
        "exercise_version_id": exercise_version_id,
        "max_weight": max_weight_pr,
        "max_volume": max_volume_pr,
        "max_reps": max_reps_pr
    }


@router.get("/summary")
async def get_workout_summary(
    days: int = Query(30, description="Number of days to look back"),
    current_user: dict = Depends(get_current_user_with_app_check)
):
    """
    Get workout summary for the last N days
    """
    db = get_firestore_client()

    start_date = datetime.now() - timedelta(days=days)

    # Only select fields we need to reduce bandwidth
    sessions_query = db.collection("workout_sessions").where(
        "user_id", "==", current_user["uid"]
    ).where(
        "start_time", ">=", start_date
    ).select(["user_id", "start_time", "end_time", "exercises"]).order_by("start_time")

    sessions = sessions_query.stream()

    total_sessions = 0
    total_volume = 0
    total_duration = 0

    for session_doc in sessions:
        session_data = session_doc.to_dict()
        total_sessions += 1

        # Calculate total volume
        for exercise in session_data.get("exercises", []):
            for set_data in exercise.get("sets", []):
                weight = set_data.get("weight", 0)
                reps = set_data.get("reps", 0)
                total_volume += weight * reps

        # Calculate duration
        if session_data.get("end_time") and session_data.get("start_time"):
            duration = (session_data["end_time"] - session_data["start_time"]).total_seconds()
            total_duration += duration

    return {
        "period_days": days,
        "total_sessions": total_sessions,
        "total_volume": total_volume,
        "total_duration_seconds": total_duration,
        "avg_duration_seconds": total_duration / total_sessions if total_sessions > 0 else 0
    }
