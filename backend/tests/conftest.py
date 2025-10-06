"""
Test configuration and fixtures for backend tests.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from main import app
from datetime import datetime
from app.core.auth import get_current_user

# Mock get_current_user to return a test user
async def mock_get_current_user_impl():
    return {
        "uid": "test-user-123",
        "email": "test@example.com"
    }

# Mock Firebase for testing
@pytest.fixture(autouse=True)
def mock_firebase():
    """Mock Firebase Admin SDK and authentication for all tests."""
    # Use FastAPI's dependency override
    app.dependency_overrides[get_current_user] = mock_get_current_user_impl

    yield

    # Clean up
    app.dependency_overrides.clear()

@pytest.fixture
def mock_db():
    """Mock Firestore database."""
    db = MagicMock()
    return db

@pytest.fixture
def client(mock_firebase):
    """Test client with mocked authentication."""
    # Create client after mock is set up
    return TestClient(app)

@pytest.fixture
def auth_headers():
    """Authentication headers for requests."""
    return {"Authorization": "Bearer mock-token"}

@pytest.fixture
def test_user():
    """Test user data."""
    return {
        "uid": "test-user-123",
        "email": "test@example.com"
    }

@pytest.fixture
def test_user_2():
    """Second test user data."""
    return {
        "uid": "test-user-456",
        "email": "test2@example.com"
    }

@pytest.fixture
def sample_exercise():
    """Sample exercise data."""
    return {
        "id": "exercise-1",
        "name": "Bench Press",
        "muscle_groups": ["chest", "triceps"],
        "equipment": "barbell",
        "category": "strength",
        "description": "Classic chest exercise",
        "created_by": "test-user-123",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }

@pytest.fixture
def sample_exercise_version():
    """Sample exercise version data."""
    return {
        "id": "version-1",
        "exercise_id": "exercise-1",
        "version_name": "Heavy",
        "target_reps": "3-5",
        "target_sets": 5,
        "notes": "Focus on strength",
        "user_id": "test-user-123",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }

@pytest.fixture
def sample_workout_plan():
    """Sample workout plan data."""
    return {
        "id": "plan-1",
        "name": "Push Day",
        "exercises": [
            {
                "exercise_version_id": "version-1",
                "order": 0,
                "planned_sets": 5,
                "planned_reps": "3-5",
                "planned_weight": 225.0,
                "is_bodyweight": False,
                "instruction": "Warm up properly",
                "timers": []
            }
        ],
        "notes": "Focus on compound movements",
        "user_id": "test-user-123",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }

@pytest.fixture
def sample_workout_session():
    """Sample workout session data."""
    return {
        "id": "session-1",
        "workout_plan_id": "plan-1",
        "exercises": [
            {
                "exercise_version_id": "version-1",
                "sets": [
                    {
                        "reps": 5,
                        "weight": 225.0,
                        "completed_at": datetime.now(),
                        "rpe": 8,
                        "notes": "Felt strong"
                    }
                ]
            }
        ],
        "notes": "Good session",
        "user_id": "test-user-123",
        "start_time": datetime.now(),
        "end_time": None,
        "garmin_data": None
    }
