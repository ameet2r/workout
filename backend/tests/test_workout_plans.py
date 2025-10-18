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

        # Mock exercise_version lookup - should exist and belong to user
        mock_version_doc = MagicMock()
        mock_version_doc.exists = True
        mock_version_doc.to_dict.return_value = {
            "user_id": "test-user-123",  # Same as auth user
            "exercise_id": "exercise-1",
            "version_name": "Strength"
        }

        # Mock for exercise_versions collection
        mock_version_ref = MagicMock()
        mock_version_ref.get.return_value = mock_version_doc
        mock_exercise_versions_collection = MagicMock()
        mock_exercise_versions_collection.document.return_value = mock_version_ref

        # Mock for workout_plans collection
        mock_doc_ref = MagicMock()
        mock_doc_ref.configure_mock(id="new-plan-id")
        mock_doc_ref.set = MagicMock()
        mock_workout_plans_collection = MagicMock()
        mock_workout_plans_collection.document.return_value = mock_doc_ref

        # Setup collection method to return appropriate mock based on collection name
        def collection_side_effect(collection_name):
            if collection_name == "exercise_versions":
                return mock_exercise_versions_collection
            elif collection_name == "workout_plans":
                return mock_workout_plans_collection
            return MagicMock()

        mock_db.collection.side_effect = collection_side_effect
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
    def test_create_plan_with_invalid_exercise_version_id(self, mock_get_db, client, auth_headers):
        """Test that creating a plan with non-existent exercise_version_id fails (security fix)."""
        # Mock Firestore
        mock_db = MagicMock()

        # Mock exercise_version lookup - return non-existent
        mock_version_doc = MagicMock()
        mock_version_doc.exists = False
        mock_db.collection.return_value.document.return_value.get.return_value = mock_version_doc

        mock_get_db.return_value = mock_db

        plan_data = {
            "name": "Test Plan",
            "exercises": [
                {
                    "exercise_version_id": "non-existent-id",
                    "order": 0,
                    "planned_sets": 3,
                    "planned_reps": "8-12"
                }
            ]
        }

        response = client.post("/api/workout-plans/", json=plan_data, headers=auth_headers)

        assert response.status_code == 400
        assert "not found" in response.json()["detail"].lower()

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_create_plan_with_unauthorized_exercise_version(self, mock_get_db, client, auth_headers):
        """Test that using another user's exercise_version_id fails (security fix)."""
        # Mock Firestore
        mock_db = MagicMock()

        # Mock exercise_version lookup - exists but belongs to different user
        mock_version_doc = MagicMock()
        mock_version_doc.exists = True
        mock_version_doc.to_dict.return_value = {
            "user_id": "different-user-456",  # Different from test-user-123
            "exercise_id": "exercise-1",
            "version_name": "Strength"
        }
        mock_db.collection.return_value.document.return_value.get.return_value = mock_version_doc

        mock_get_db.return_value = mock_db

        plan_data = {
            "name": "Test Plan",
            "exercises": [
                {
                    "exercise_version_id": "other-users-version",
                    "order": 0,
                    "planned_sets": 3,
                    "planned_reps": "8-12"
                }
            ]
        }

        response = client.post("/api/workout-plans/", json=plan_data, headers=auth_headers)

        assert response.status_code == 403
        assert "not authorized" in response.json()["detail"].lower()

    @patch('app.api.routes.workout_plans.get_firestore_client')
    def test_create_plan_name_whitespace_only(self, mock_get_db, client, auth_headers):
        """Test that plan name with only whitespace is rejected (security fix)."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        plan_data = {
            "name": "   ",  # Only whitespace
            "exercises": []
        }

        response = client.post("/api/workout-plans/", json=plan_data, headers=auth_headers)

        assert response.status_code == 400
        assert "cannot be empty" in response.json()["detail"].lower()

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
        from app.core.auth import get_current_user_with_app_check
        from main import app
        from tests.conftest import mock_get_current_user_with_app_check_impl

        # Override authentication for different user
        async def different_user():
            return {
                "uid": "different-user-123",
                "email": "different@example.com"
            }

        try:
            app.dependency_overrides[get_current_user_with_app_check] = different_user

            # Mock Firestore
            mock_db = MagicMock()
            mock_doc = MagicMock()
            mock_doc.exists = True
            mock_doc.to_dict.return_value = sample_workout_plan
            mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
            mock_get_db.return_value = mock_db

            response = client.get(
                f"/api/workout-plans/{sample_workout_plan['id']}",
                headers={"Authorization": "Bearer different-token", "X-Firebase-AppCheck": "mock-token"}
            )

            assert response.status_code == 403
        finally:
            # Restore original mock
            app.dependency_overrides[get_current_user_with_app_check] = mock_get_current_user_with_app_check_impl

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
