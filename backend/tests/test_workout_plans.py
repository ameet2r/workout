"""
Tests for workout plan endpoints and validation.
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime


class TestWorkoutPlanEndpoints:
    """Test workout plan CRUD operations."""

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_create_workout_plan_success(self, mock_get_db, client, auth_headers):
        """Test successful workout plan creation."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc_ref = MagicMock()
        mock_doc_ref.configure_mock(id="new-plan-id")
        mock_doc_ref.set = MagicMock()
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        mock_get_db.return_value = mock_db

        plan_data = {
            "name": "Push Day",
            "exercises": [
                {
                    "exercise_version_id": "version-1",
                    "order": 0,
                    "planned_sets": 5,
                    "planned_reps": "3-5",
                    "planned_weight": 225.0,
                    "is_bodyweight": False
                }
            ],
            "notes": "Focus on strength"
        }

        response = client.post("/api/workout-plans/", json=plan_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Push Day"
        assert data["user_id"] == "test-user-123"
        assert data["id"] == "new-plan-id"

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_create_workout_plan_validation_name_too_long(self, mock_get_db, client, auth_headers):
        """Test validation: plan name too long."""
        plan_data = {
            "name": "A" * 201,  # Exceeds 200 char limit
            "exercises": []
        }

        response = client.post("/api/workout-plans/", json=plan_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_create_workout_plan_validation_name_empty(self, mock_get_db, client, auth_headers):
        """Test validation: plan name empty."""
        plan_data = {
            "name": "",
            "exercises": []
        }

        response = client.post("/api/workout-plans/", json=plan_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_create_workout_plan_validation_too_many_exercises(self, mock_get_db, client, auth_headers):
        """Test validation: too many exercises in plan."""
        plan_data = {
            "name": "Test Plan",
            "exercises": [
                {
                    "exercise_version_id": f"version-{i}",
                    "order": i,
                    "planned_sets": 3
                }
                for i in range(51)  # Exceeds max of 50
            ]
        }

        response = client.post("/api/workout-plans/", json=plan_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_create_workout_plan_validation_planned_weight_negative(self, mock_get_db, client, auth_headers):
        """Test validation: negative planned weight."""
        plan_data = {
            "name": "Test Plan",
            "exercises": [
                {
                    "exercise_version_id": "version-1",
                    "order": 0,
                    "planned_weight": -50.0  # Negative weight
                }
            ]
        }

        response = client.post("/api/workout-plans/", json=plan_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_create_workout_plan_validation_planned_weight_too_high(self, mock_get_db, client, auth_headers):
        """Test validation: planned weight too high."""
        plan_data = {
            "name": "Test Plan",
            "exercises": [
                {
                    "exercise_version_id": "version-1",
                    "order": 0,
                    "planned_weight": 10001.0  # Exceeds max of 10000
                }
            ]
        }

        response = client.post("/api/workout-plans/", json=plan_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_create_workout_plan_validation_timer_duration_invalid(self, mock_get_db, client, auth_headers):
        """Test validation: timer duration out of range."""
        plan_data = {
            "name": "Test Plan",
            "exercises": [
                {
                    "exercise_version_id": "version-1",
                    "order": 0,
                    "timers": [
                        {
                            "duration": 86401,  # Exceeds 24 hours (86400 seconds)
                            "type": "total"
                        }
                    ]
                }
            ]
        }

        response = client.post("/api/workout-plans/", json=plan_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_create_workout_plan_validation_timer_type_invalid(self, mock_get_db, client, auth_headers):
        """Test validation: invalid timer type."""
        plan_data = {
            "name": "Test Plan",
            "exercises": [
                {
                    "exercise_version_id": "version-1",
                    "order": 0,
                    "timers": [
                        {
                            "duration": 60,
                            "type": "invalid_type"  # Not 'total' or 'per_set'
                        }
                    ]
                }
            ]
        }

        response = client.post("/api/workout-plans/", json=plan_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_list_workout_plans(self, mock_get_db, client, auth_headers, sample_workout_plan):
        """Test listing user's workout plans."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.id = sample_workout_plan["id"]
        mock_doc.to_dict.return_value = sample_workout_plan
        mock_db.collection.return_value.where.return_value.stream.return_value = [mock_doc]
        mock_get_db.return_value = mock_db

        response = client.get("/api/workout-plans/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_get_workout_plan_by_id(self, mock_get_db, client, auth_headers, sample_workout_plan):
        """Test getting workout plan by ID."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = True
        # Ensure user_id matches the test user
        plan_copy = sample_workout_plan.copy()
        plan_copy["user_id"] = "test-user-123"
        mock_doc.to_dict.return_value = plan_copy
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
        mock_get_db.return_value = mock_db

        response = client.get(f"/api/workout-plans/{sample_workout_plan['id']}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_workout_plan["name"]

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_get_workout_plan_unauthorized(self, mock_get_db, client, sample_workout_plan):
        """Test accessing another user's workout plan (should fail)."""
        from app.core.auth import get_current_user
        from main import app

        # Override authentication for different user
        async def different_user():
            return {
                "uid": "different-user-123",
                "email": "different@example.com"
            }
        app.dependency_overrides[get_current_user] = different_user

        # Mock Firestore
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = sample_workout_plan
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
        mock_get_db.return_value = mock_db

        response = client.get(
            f"/api/workout-plans/{sample_workout_plan['id']}",
            headers={"Authorization": "Bearer different-token"}
        )

        assert response.status_code == 403

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_delete_workout_plan(self, mock_get_db, client, auth_headers, sample_workout_plan):
        """Test deleting a workout plan."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = True
        # Ensure user_id matches the test user
        plan_copy = sample_workout_plan.copy()
        plan_copy["user_id"] = "test-user-123"
        mock_doc.to_dict.return_value = plan_copy
        mock_doc_ref = MagicMock()
        mock_doc_ref.get.return_value = mock_doc
        mock_doc_ref.delete = MagicMock()
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        mock_get_db.return_value = mock_db

        response = client.delete(f"/api/workout-plans/{sample_workout_plan['id']}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "deleted" in data["message"].lower()
