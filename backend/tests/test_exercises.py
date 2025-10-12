"""
Tests for exercise endpoints and validation.
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime


class TestExerciseEndpoints:
    """Test exercise CRUD operations."""

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_create_exercise_success(self, mock_get_db, client, auth_headers):
        """Test successful exercise creation."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc_ref = MagicMock()
        mock_doc_ref.configure_mock(id="new-exercise-id")
        mock_doc_ref.set = MagicMock()
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        mock_get_db.return_value = mock_db

        exercise_data = {
            "name": "Squat",
            "muscle_groups": ["quads", "glutes"],
            "equipment": "barbell",
            "category": "strength",
            "description": "King of exercises"
        }

        response = client.post("/api/exercises/", json=exercise_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Squat"
        assert data["created_by"] == "test-user-123"
        assert data["id"] == "new-exercise-id"

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_create_exercise_validation_name_too_long(self, mock_get_db, client, auth_headers):
        """Test validation: name exceeds max length."""
        exercise_data = {
            "name": "A" * 201,  # Exceeds 200 char limit
            "category": "strength"
        }

        response = client.post("/api/exercises/", json=exercise_data, headers=auth_headers)

        assert response.status_code == 422
        assert "name" in response.text.lower()

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_create_exercise_validation_name_empty(self, mock_get_db, client, auth_headers):
        """Test validation: name is empty."""
        exercise_data = {
            "name": "",
            "category": "strength"
        }

        response = client.post("/api/exercises/", json=exercise_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_create_exercise_validation_name_whitespace_only(self, mock_get_db, client, auth_headers):
        """Test validation: name contains only whitespace (new security feature)."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc_ref = MagicMock()
        mock_doc_ref.configure_mock(id="new-exercise-id")
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        mock_get_db.return_value = mock_db

        exercise_data = {
            "name": "   ",  # Only whitespace
            "category": "strength"
        }

        response = client.post("/api/exercises/", json=exercise_data, headers=auth_headers)

        assert response.status_code == 400
        assert "cannot be empty" in response.json()["detail"].lower()

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_create_exercise_validation_description_too_long(self, mock_get_db, client, auth_headers):
        """Test validation: description exceeds max length."""
        exercise_data = {
            "name": "Test Exercise",
            "description": "A" * 2001,  # Exceeds 2000 char limit
            "category": "strength"
        }

        response = client.post("/api/exercises/", json=exercise_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_list_exercises(self, mock_get_db, client, auth_headers, sample_exercise):
        """Test listing exercises - should only return user's own exercises (security fix)."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.id = sample_exercise["id"]
        mock_doc.to_dict.return_value = sample_exercise
        # Return exercises filtered by user_id
        mock_db.collection.return_value.where.return_value.stream.return_value = [mock_doc]
        mock_get_db.return_value = mock_db

        response = client.get("/api/exercises/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify the where clause was called with user_id filter
        mock_db.collection.return_value.where.assert_called_once_with(
            "created_by", "==", "test-user-123"
        )

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_get_exercise_by_id(self, mock_get_db, client, auth_headers, sample_exercise):
        """Test getting exercise by ID."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = sample_exercise
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
        mock_get_db.return_value = mock_db

        response = client.get(f"/api/exercises/{sample_exercise['id']}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_exercise["name"]

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_get_exercise_not_found(self, mock_get_db, client, auth_headers):
        """Test getting non-existent exercise."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
        mock_get_db.return_value = mock_db

        response = client.get("/api/exercises/non-existent-id", headers=auth_headers)

        assert response.status_code == 404

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_update_exercise_as_creator(self, mock_get_db, client, auth_headers, sample_exercise):
        """Test updating exercise as creator."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = True
        # Ensure created_by matches the test user
        sample_exercise_copy = sample_exercise.copy()
        sample_exercise_copy["created_by"] = "test-user-123"
        mock_doc.to_dict.return_value = sample_exercise_copy

        updated_exercise = sample_exercise_copy.copy()
        updated_exercise["name"] = "Updated Name"

        mock_updated_doc = MagicMock()
        mock_updated_doc.to_dict.return_value = updated_exercise

        mock_doc_ref = MagicMock()
        mock_doc_ref.get.side_effect = [mock_doc, mock_updated_doc]
        mock_doc_ref.update = MagicMock()

        mock_db.collection.return_value.document.return_value = mock_doc_ref
        mock_get_db.return_value = mock_db

        update_data = {"name": "Updated Name"}
        response = client.patch(
            f"/api/exercises/{sample_exercise['id']}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_update_exercise_unauthorized(self, mock_get_db, client, sample_exercise):
        """Test updating exercise as non-creator (should fail)."""
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
        mock_doc.to_dict.return_value = sample_exercise

        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
        mock_get_db.return_value = mock_db

        update_data = {"name": "Unauthorized Update"}
        response = client.patch(
            f"/api/exercises/{sample_exercise['id']}",
            json=update_data,
            headers={"Authorization": "Bearer different-token"}
        )

        assert response.status_code == 403


class TestExerciseVersionEndpoints:
    """Test exercise version CRUD operations."""

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_create_exercise_version_success(self, mock_get_db, client, auth_headers):
        """Test successful exercise version creation."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc_ref = MagicMock()
        mock_doc_ref.configure_mock(id="new-version-id")
        mock_doc_ref.set = MagicMock()
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        mock_get_db.return_value = mock_db

        version_data = {
            "exercise_id": "exercise-1",
            "version_name": "Strength",
            "target_reps": "3-5",
            "target_sets": 5,
            "notes": "Heavy lifting"
        }

        response = client.post("/api/exercises/versions", json=version_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["version_name"] == "Strength"
        assert data["user_id"] == "test-user-123"
        assert data["id"] == "new-version-id"

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_create_exercise_version_validation_name_too_long(self, mock_get_db, client, auth_headers):
        """Test validation: version name too long."""
        version_data = {
            "exercise_id": "exercise-1",
            "version_name": "A" * 101,  # Exceeds 100 char limit
            "target_reps": "3-5"
        }

        response = client.post("/api/exercises/versions", json=version_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_create_exercise_version_validation_target_sets_invalid(self, mock_get_db, client, auth_headers):
        """Test validation: target sets out of range."""
        version_data = {
            "exercise_id": "exercise-1",
            "version_name": "Test",
            "target_sets": 101  # Exceeds max of 100
        }

        response = client.post("/api/exercises/versions", json=version_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_create_exercise_version_validation_target_sets_negative(self, mock_get_db, client, auth_headers):
        """Test validation: negative target sets."""
        version_data = {
            "exercise_id": "exercise-1",
            "version_name": "Test",
            "target_sets": 0  # Less than min of 1
        }

        response = client.post("/api/exercises/versions", json=version_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.api.routes.exercises.get_firestore_client')
    def test_list_my_exercise_versions(self, mock_get_db, client, auth_headers, sample_exercise_version):
        """Test listing user's exercise versions."""
        # Mock Firestore
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_doc.id = sample_exercise_version["id"]
        mock_doc.to_dict.return_value = sample_exercise_version
        mock_db.collection.return_value.where.return_value.stream.return_value = [mock_doc]
        mock_get_db.return_value = mock_db

        response = client.get("/api/exercises/versions/my-versions", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
