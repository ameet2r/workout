from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
from app.core.auth import get_current_user
from app.core.firebase import get_firestore_client
from app.schemas.workout_session import WorkoutSession, WorkoutSessionCreate, WorkoutSessionUpdate
from app.utils.garmin_parser import parse_garmin_file, batch_time_series_data, batch_gps_data
from datetime import datetime

router = APIRouter()


@router.post("/", response_model=WorkoutSession)
async def create_workout_session(
    session: WorkoutSessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Start a new workout session (or create a past workout with custom start_time)
    """
    db = get_firestore_client()
    session_ref = db.collection("workout_sessions").document()

    session_data = session.model_dump()
    session_data["user_id"] = current_user["uid"]

    # Use provided start_time or default to now
    start_time = session.start_time if session.start_time else datetime.now()
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
    List workout sessions for the current user (excludes garmin_data and notes for performance)
    """
    db = get_firestore_client()

    # Only fetch fields needed for list view to reduce bandwidth
    # Excludes: garmin_data, notes (only needed in detail view)
    sessions_ref = db.collection("workout_sessions").where(
        "user_id", "==", current_user["uid"]
    ).select([
        "user_id",
        "start_time",
        "end_time",
        "name",
        "workout_plan_id",
        "exercises"
    ]).limit(limit)

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
async def get_workout_session(
    session_id: str,
    fields: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get workout session by ID

    Args:
        session_id: ID of the workout session
        fields: Optional comma-separated list of fields to fetch (e.g., "garmin_data,notes")
                If not provided, fetches all fields.
    """
    db = get_firestore_client()

    # If specific fields requested, use Query.select() to reduce bandwidth from Firestore
    if fields:
        field_list = [f.strip() for f in fields.split(",")]
        # Always include required fields for authorization, response validation, and UI display
        required_fields = ["user_id", "start_time", "end_time", "name", "workout_plan_id", "exercises"]
        for required_field in required_fields:
            if required_field not in field_list:
                field_list.append(required_field)

        # Use query with document reference filter to enable select()
        doc_ref = db.collection("workout_sessions").document(session_id)
        query = db.collection("workout_sessions").where("__name__", "==", doc_ref).select(field_list)
        docs = list(query.stream())

        if not docs:
            raise HTTPException(status_code=404, detail="Workout session not found")

        session_data = docs[0].to_dict()
    else:
        # Fetch all fields using DocumentReference (default behavior)
        session_ref = db.collection("workout_sessions").document(session_id)
        session_doc = session_ref.get()

        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Workout session not found")

        session_data = session_doc.to_dict()

    # Verify authorization
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


@router.post("/{session_id}/upload-garmin")
async def upload_garmin_file(
    session_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and parse a Garmin file (TCX, GPX, or ZIP) for a workout session
    """
    # Validate file size (10 MB limit)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    file_content = await file.read()

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB")

    # Validate file type
    allowed_extensions = ['.fit', '.tcx', '.gpx', '.zip']
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a .fit, .tcx, .gpx, or .zip file"
        )

    # Get session and verify ownership
    db = get_firestore_client()
    session_ref = db.collection("workout_sessions").document(session_id)
    session_doc = session_ref.get()

    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="Workout session not found")

    session_data = session_doc.to_dict()
    if session_data["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this session")

    try:
        # Parse the file
        parsed_data = parse_garmin_file(file.filename, file_content)

        # Update session with summary data
        garmin_data = parsed_data['summary']
        update_data = {"garmin_data": garmin_data}

        # Always use timestamps from Garmin file if available
        if parsed_data.get('start_time'):
            start_time = parsed_data['start_time']
            # Ensure start_time is a datetime object
            if isinstance(start_time, str):
                from dateutil import parser as date_parser
                start_time = date_parser.parse(start_time)

            update_data['start_time'] = start_time

            # Calculate end_time from duration
            if garmin_data.get('duration'):
                from datetime import timedelta
                end = start_time + timedelta(seconds=garmin_data['duration'])
                update_data['end_time'] = end

        session_ref.update(update_data)

        # Store time-series data in subcollections using batch writes
        time_series_ref = session_ref.collection("time_series")

        # Collect all writes to execute in batches
        all_writes = []

        # Heart rate data
        if parsed_data['time_series']['heart_rate']:
            hr_batches = batch_time_series_data(parsed_data['time_series']['heart_rate'])
            for idx, batch in enumerate(hr_batches):
                all_writes.append((f"heart_rate_{idx}", {"data": batch}))

        # GPS data
        if parsed_data['time_series']['gps']:
            gps_batches = batch_gps_data(parsed_data['time_series']['gps'])
            for idx, batch in enumerate(gps_batches):
                all_writes.append((f"gps_{idx}", {"data": batch}))

        # Temperature data
        if parsed_data['time_series']['temperature']:
            temp_batches = batch_time_series_data(parsed_data['time_series']['temperature'])
            for idx, batch in enumerate(temp_batches):
                all_writes.append((f"temperature_{idx}", {"data": batch}))

        # Cadence data
        if parsed_data['time_series']['cadence']:
            cad_batches = batch_time_series_data(parsed_data['time_series']['cadence'])
            for idx, batch in enumerate(cad_batches):
                all_writes.append((f"cadence_{idx}", {"data": batch}))

        # Power data
        if parsed_data['time_series']['power']:
            power_batches = batch_time_series_data(parsed_data['time_series']['power'])
            for idx, batch in enumerate(power_batches):
                all_writes.append((f"power_{idx}", {"data": batch}))

        # Altitude data
        if parsed_data['time_series']['altitude']:
            altitude_batches = batch_time_series_data(parsed_data['time_series']['altitude'])
            for idx, batch in enumerate(altitude_batches):
                all_writes.append((f"altitude_{idx}", {"data": batch}))

        # Execute all writes in batches (Firestore allows max 500 operations per batch)
        FIRESTORE_BATCH_LIMIT = 500
        for i in range(0, len(all_writes), FIRESTORE_BATCH_LIMIT):
            batch = db.batch()
            for doc_id, data in all_writes[i:i + FIRESTORE_BATCH_LIMIT]:
                batch.set(time_series_ref.document(doc_id), data)
            batch.commit()

        # Get the updated session and return it
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

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Log the full error for debugging
        import traceback
        error_details = traceback.format_exc()
        print(f"Error processing Garmin file: {error_details}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.post("/import-garmin", response_model=WorkoutSession)
async def import_garmin_workout(
    file: UploadFile = File(...),
    notes: str = "",
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new workout session and upload Garmin file in a single request.
    This is optimized for importing workouts from Garmin devices.
    """
    # Validate file size (10 MB limit)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    file_content = await file.read()

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB")

    # Validate file type
    allowed_extensions = ['.fit', '.tcx', '.gpx', '.zip']
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a .fit, .tcx, .gpx, or .zip file"
        )

    try:
        # Parse the file first
        parsed_data = parse_garmin_file(file.filename, file_content)
        garmin_data = parsed_data['summary']

        # Create workout session with Garmin data
        db = get_firestore_client()
        session_ref = db.collection("workout_sessions").document()

        # Build session data
        session_data = {
            "user_id": current_user["uid"],
            "exercises": [],
            "notes": notes or f"Imported from {file.filename}",
            "garmin_data": garmin_data
        }

        # Use start_time from Garmin file if available
        if parsed_data.get('start_time'):
            start_time = parsed_data['start_time']
            if isinstance(start_time, str):
                from dateutil import parser as date_parser
                start_time = date_parser.parse(start_time)
            session_data['start_time'] = start_time

            # Calculate end_time from duration
            if garmin_data.get('duration'):
                from datetime import timedelta
                end_time = start_time + timedelta(seconds=garmin_data['duration'])
                session_data['end_time'] = end_time
            else:
                session_data['end_time'] = None
        else:
            session_data["start_time"] = datetime.now()
            session_data["end_time"] = None

        # Create the session
        session_ref.set(session_data)

        # Store time-series data in subcollections using batch writes
        time_series_ref = session_ref.collection("time_series")
        all_writes = []

        # Heart rate data
        if parsed_data['time_series']['heart_rate']:
            hr_batches = batch_time_series_data(parsed_data['time_series']['heart_rate'])
            for idx, batch in enumerate(hr_batches):
                all_writes.append((f"heart_rate_{idx}", {"data": batch}))

        # GPS data
        if parsed_data['time_series']['gps']:
            gps_batches = batch_gps_data(parsed_data['time_series']['gps'])
            for idx, batch in enumerate(gps_batches):
                all_writes.append((f"gps_{idx}", {"data": batch}))

        # Temperature data
        if parsed_data['time_series']['temperature']:
            temp_batches = batch_time_series_data(parsed_data['time_series']['temperature'])
            for idx, batch in enumerate(temp_batches):
                all_writes.append((f"temperature_{idx}", {"data": batch}))

        # Cadence data
        if parsed_data['time_series']['cadence']:
            cad_batches = batch_time_series_data(parsed_data['time_series']['cadence'])
            for idx, batch in enumerate(cad_batches):
                all_writes.append((f"cadence_{idx}", {"data": batch}))

        # Power data
        if parsed_data['time_series']['power']:
            power_batches = batch_time_series_data(parsed_data['time_series']['power'])
            for idx, batch in enumerate(power_batches):
                all_writes.append((f"power_{idx}", {"data": batch}))

        # Altitude data
        if parsed_data['time_series']['altitude']:
            altitude_batches = batch_time_series_data(parsed_data['time_series']['altitude'])
            for idx, batch in enumerate(altitude_batches):
                all_writes.append((f"altitude_{idx}", {"data": batch}))

        # Execute all writes in batches
        FIRESTORE_BATCH_LIMIT = 500
        for i in range(0, len(all_writes), FIRESTORE_BATCH_LIMIT):
            batch = db.batch()
            for doc_id, data in all_writes[i:i + FIRESTORE_BATCH_LIMIT]:
                batch.set(time_series_ref.document(doc_id), data)
            batch.commit()

        # Return the created session
        final_session_data = session_data.copy()
        if "start_time" in final_session_data and final_session_data["start_time"]:
            final_session_data["start_time"] = final_session_data["start_time"].isoformat() if hasattr(final_session_data["start_time"], "isoformat") else final_session_data["start_time"]
        if "end_time" in final_session_data and final_session_data["end_time"]:
            final_session_data["end_time"] = final_session_data["end_time"].isoformat() if hasattr(final_session_data["end_time"], "isoformat") else final_session_data["end_time"]

        return {
            "id": session_ref.id,
            **final_session_data
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error importing Garmin workout: {error_details}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.get("/{session_id}/time-series/{data_type}")
async def get_time_series_data(
    session_id: str,
    data_type: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get time-series data for a workout session
    Supported data_type: heart_rate, gps, temperature, cadence, power, altitude
    """
    if data_type not in ['heart_rate', 'gps', 'temperature', 'cadence', 'power', 'altitude']:
        raise HTTPException(status_code=400, detail="Invalid data type")

    db = get_firestore_client()
    session_ref = db.collection("workout_sessions").document(session_id)
    session_doc = session_ref.get()

    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="Workout session not found")

    session_data = session_doc.to_dict()
    if session_data["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this session")

    # Retrieve all batches for the data type
    time_series_ref = session_ref.collection("time_series")

    try:
        # Use range query to only fetch documents with IDs starting with data_type prefix
        prefix_start = time_series_ref.document(f"{data_type}_")
        # Use high unicode character to create upper bound for the range
        prefix_end = time_series_ref.document(f"{data_type}_\uf8ff")

        docs = time_series_ref.where(
            "__name__", ">=", prefix_start
        ).where(
            "__name__", "<=", prefix_end
        ).stream()

        all_data = []
        for doc in docs:
            doc_data = doc.to_dict()
            if "data" in doc_data:
                all_data.extend(doc_data["data"])

        return {
            "data_type": data_type,
            "data": all_data,
            "count": len(all_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving time-series data: {str(e)}")


@router.delete("/{session_id}/garmin-data")
async def delete_garmin_data(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete all Garmin data (summary and time-series) from a workout session
    """
    db = get_firestore_client()
    session_ref = db.collection("workout_sessions").document(session_id)
    session_doc = session_ref.get()

    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="Workout session not found")

    session_data = session_doc.to_dict()
    if session_data["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this session")

    try:
        # Delete all time-series data from subcollection
        time_series_ref = session_ref.collection("time_series")
        docs = time_series_ref.stream()

        deleted_count = 0
        for doc in docs:
            doc.reference.delete()
            deleted_count += 1

        # Remove garmin_data field from session document
        session_ref.update({"garmin_data": None})

        return {
            "message": "Garmin data deleted successfully",
            "time_series_documents_deleted": deleted_count
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting Garmin data: {str(e)}")


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
