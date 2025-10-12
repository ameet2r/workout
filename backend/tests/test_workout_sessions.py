"""
Tests for workout session endpoints and validation.
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime


class TestWorkoutSessionEndpoints:
    """Test workout session CRUD operations."""

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_create_workout_session_success(self, mock_get_db, client, auth_headers):
        """Test successful workout session creation."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc_ref = MagicMock()
        mock_doc_ref.configure_mock(id="new-session-id")
        mock_doc_ref.set = MagicMock()
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        mock_get_db.return_value = mock_db

        session_data = {
            "workout_plan_id": "plan-1",
            "exercises": [],
            "notes": "Good workout"
        }

        response = client.post("/api/workout-sessions/", json=session_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "test-user-123"
        assert data["id"] == "new-session-id"
        assert "start_time" in data

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_create_workout_session_validation_reps_negative(self, mock_get_db, client, auth_headers):
        """Test validation: negative reps."""
        session_data = {
            "exercises": [
                {
                    "exercise_version_id": "version-1",
                    "sets": [
                        {
                            "reps": -1,  # Negative reps
                            "weight": 225.0,
                            "completed_at": datetime.now().isoformat()
                        }
                    ]
                }
            ]
        }

        response = client.post("/api/workout-sessions/", json=session_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_create_workout_session_validation_reps_too_high(self, mock_get_db, client, auth_headers):
        """Test validation: reps too high."""
        session_data = {
            "exercises": [
                {
                    "exercise_version_id": "version-1",
                    "sets": [
                        {
                            "reps": 1001,  # Exceeds max of 1000
                            "weight": 225.0,
                            "completed_at": datetime.now().isoformat()
                        }
                    ]
                }
            ]
        }

        response = client.post("/api/workout-sessions/", json=session_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_create_workout_session_validation_weight_negative(self, mock_get_db, client, auth_headers):
        """Test validation: negative weight."""
        session_data = {
            "exercises": [
                {
                    "exercise_version_id": "version-1",
                    "sets": [
                        {
                            "reps": 5,
                            "weight": -50.0,  # Negative weight
                            "completed_at": datetime.now().isoformat()
                        }
                    ]
                }
            ]
        }

        response = client.post("/api/workout-sessions/", json=session_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_create_workout_session_validation_weight_too_high(self, mock_get_db, client, auth_headers):
        """Test validation: weight too high."""
        session_data = {
            "exercises": [
                {
                    "exercise_version_id": "version-1",
                    "sets": [
                        {
                            "reps": 5,
                            "weight": 10001.0,  # Exceeds max of 10000
                            "completed_at": datetime.now().isoformat()
                        }
                    ]
                }
            ]
        }

        response = client.post("/api/workout-sessions/", json=session_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_create_workout_session_validation_rpe_too_low(self, mock_get_db, client, auth_headers):
        """Test validation: RPE below minimum."""
        session_data = {
            "exercises": [
                {
                    "exercise_version_id": "version-1",
                    "sets": [
                        {
                            "reps": 5,
                            "weight": 225.0,
                            "completed_at": datetime.now().isoformat(),
                            "rpe": 0  # Below min of 1
                        }
                    ]
                }
            ]
        }

        response = client.post("/api/workout-sessions/", json=session_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_create_workout_session_validation_rpe_too_high(self, mock_get_db, client, auth_headers):
        """Test validation: RPE above maximum."""
        session_data = {
            "exercises": [
                {
                    "exercise_version_id": "version-1",
                    "sets": [
                        {
                            "reps": 5,
                            "weight": 225.0,
                            "completed_at": datetime.now().isoformat(),
                            "rpe": 11  # Above max of 10
                        }
                    ]
                }
            ]
        }

        response = client.post("/api/workout-sessions/", json=session_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_create_workout_session_validation_too_many_sets(self, mock_get_db, client, auth_headers):
        """Test validation: too many sets in exercise."""
        session_data = {
            "exercises": [
                {
                    "exercise_version_id": "version-1",
                    "sets": [
                        {
                            "reps": 5,
                            "weight": 225.0,
                            "completed_at": datetime.now().isoformat()
                        }
                        for _ in range(101)  # Exceeds max of 100
                    ]
                }
            ]
        }

        response = client.post("/api/workout-sessions/", json=session_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_create_workout_session_validation_garmin_heart_rate_invalid(self, mock_get_db, client, auth_headers):
        """Test validation: invalid Garmin heart rate."""
        # Mock Firestore (needed in case validation doesn't catch it)
        mock_db = MagicMock()
        mock_doc_ref = MagicMock()
        mock_doc_ref.configure_mock(id="test-id")
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        mock_get_db.return_value = mock_db

        session_data = {
            "exercises": [],
            "garmin_data": {
                "avg_heart_rate": 301  # Above max of 300
            }
        }

        response = client.post("/api/workout-sessions/", json=session_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_list_workout_sessions(self, mock_get_db, client, auth_headers, sample_workout_session):
        """Test listing user's workout sessions."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.id = sample_workout_session["id"]
        mock_doc.to_dict.return_value = sample_workout_session
        mock_db.collection.return_value.where.return_value.limit.return_value.stream.return_value = [mock_doc]
        mock_get_db.return_value = mock_db

        response = client.get("/api/workout-sessions/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_complete_workout_session(self, mock_get_db, client, auth_headers, sample_workout_session):
        """Test completing a workout session."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = True
        # Ensure user_id matches the test user
        session_copy = sample_workout_session.copy()
        session_copy["user_id"] = "test-user-123"
        mock_doc.to_dict.return_value = session_copy

        completed_session = session_copy.copy()
        completed_session["end_time"] = datetime.now()

        mock_updated_doc = MagicMock()
        mock_updated_doc.to_dict.return_value = completed_session

        mock_doc_ref = MagicMock()
        mock_doc_ref.get.side_effect = [mock_doc, mock_updated_doc]
        mock_doc_ref.update = MagicMock()
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        mock_get_db.return_value = mock_db

        response = client.post(
            f"/api/workout-sessions/{sample_workout_session['id']}/complete",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "end_time" in data

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_delete_workout_session(self, mock_get_db, client, auth_headers, sample_workout_session):
        """Test deleting a workout session."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = True
        # Ensure user_id matches the test user
        session_copy = sample_workout_session.copy()
        session_copy["user_id"] = "test-user-123"
        mock_doc.to_dict.return_value = session_copy
        mock_doc_ref = MagicMock()
        mock_doc_ref.get.return_value = mock_doc
        mock_doc_ref.delete = MagicMock()
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        mock_get_db.return_value = mock_db

        response = client.delete(
            f"/api/workout-sessions/{sample_workout_session['id']}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "deleted" in data["message"].lower()

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_list_sessions_with_invalid_date_range(self, mock_get_db, client, auth_headers):
        """Test that listing sessions with invalid date range fails (security fix)."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        # end_date before start_date - should fail
        response = client.get(
            "/api/workout-sessions/?start_date=2024-12-31&end_date=2024-01-01",
            headers=auth_headers
        )

        assert response.status_code == 400
        assert "after or equal to" in response.json()["detail"].lower()

    @patch('app.api.routes.workout_sessions.get_firestore_client')
    def test_list_sessions_with_valid_date_range(self, mock_get_db, client, auth_headers, sample_workout_session):
        """Test that listing sessions with valid date range works."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.id = sample_workout_session["id"]
        mock_doc.to_dict.return_value = sample_workout_session

        # Mock the query chain
        mock_where1 = MagicMock()
        mock_where2 = MagicMock()
        mock_where3 = MagicMock()
        mock_select = MagicMock()

        mock_db.collection.return_value.where.return_value = mock_where1
        mock_where1.where.return_value = mock_where2
        mock_where2.where.return_value = mock_where3
        mock_where3.select.return_value = mock_select
        mock_select.limit.return_value.stream.return_value = [mock_doc]

        mock_get_db.return_value = mock_db

        # Same dates should work
        response = client.get(
            "/api/workout-sessions/?start_date=2024-01-01&end_date=2024-12-31",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
