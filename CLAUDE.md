# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack workout tracking application with React frontend and FastAPI backend, using Firebase for authentication and Firestore for data storage. The app supports workout planning, live tracking, progress analytics, and Garmin integration.

**Key Features:**
- Workout plan creation and management
- Live workout tracking with real-time adjustments
- Exercise versions (different rep/set schemes for same exercise)
- Progress analytics with charts
- Garmin .FIT/.TCX/.GPX file import for GPS-tracked workouts
- Web Bluetooth heart rate monitoring during workouts

## Monorepo Structure

This is a monorepo with separate frontend and backend directories. Each has its own CLAUDE.md file:
- `backend/CLAUDE.md` - Backend-specific guidance (FastAPI, Firebase Admin, Firestore)
- `frontend/CLAUDE.md` - Frontend-specific guidance (React, MUI, Firebase Client SDK)

When working on backend or frontend code, **refer to the respective CLAUDE.md file** for detailed architecture, patterns, and commands.

## Quick Start

### Development Workflow

1. **Start backend** (in one terminal):
```bash
cd backend
docker compose up
```
API runs at `http://localhost:8000` (docs at `/docs`)

2. **Start frontend** (in another terminal):
```bash
cd frontend
docker compose up frontend-dev
```
App runs at `http://localhost:5173`

### Environment Setup

Both directories require `.env` files. Copy from `.env.example`:

**Backend (`backend/.env`):**
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_PATH=/path/to/serviceAccountKey.json
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Frontend (`frontend/.env`):**
```bash
VITE_BACKEND_API=http://localhost:8000
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

### Running Tests

**Backend tests:**
```bash
cd backend
pytest
```

Run specific test file:
```bash
pytest tests/test_exercises.py
```

Run single test:
```bash
pytest tests/test_exercises.py::TestExerciseEndpoints::test_create_exercise_success -v
```

## Architecture Overview

### Authentication & Security

**Dual Token System:**
- Frontend uses Firebase Auth client SDK for signup/login
- Frontend obtains two tokens for each request:
  1. **Firebase ID Token** - User authentication (`Authorization: Bearer {token}`)
  2. **App Check Token** - App authenticity verification (`X-Firebase-AppCheck: {token}`)
- Backend verifies both tokens before granting access
- App Check uses reCAPTCHA v3 to prevent abuse from unauthorized clients

**Flow:**
1. User signs up/logs in via Firebase Auth (frontend)
2. Frontend gets Firebase ID token and App Check token
3. All API calls include both tokens in headers
4. Backend verifies App Check token (proves request is from legitimate app)
5. Backend verifies Firebase ID token (proves user identity)
6. Backend uses `uid` from decoded token to scope all data access

**Protected Routes:**
- Use `Depends(get_current_user_with_app_check)` for new endpoints (recommended)
- Legacy `Depends(get_current_user)` available without App Check requirement
- Returns `{"uid": str, "email": str}` on success

### Data Flow

**Backend (`app/core/firebase.py`):**
- `get_firestore_client()` - Singleton Firestore client
- `verify_firebase_token(token)` - Verifies user authentication
- `verify_app_check_token(token)` - Verifies app authenticity

**Frontend (`src/utils/api.js`):**
- `authenticatedGet/Post/Patch/Delete(url, data)` - Auto-injects both tokens
- All API calls use these helpers to ensure proper authentication

### Firestore Collections

- **users** - User profiles (uid as document ID)
- **exercises** - Global exercise library (name, muscle groups, equipment)
- **exercise_versions** - User-specific exercise variations (e.g., "Squat - Strength" vs "Squat - Hypertrophy")
- **workout_plans** - Workout templates with exercises, sets, reps, weights
- **workout_sessions** - Completed workouts with actual performance data, Garmin data, heart rate

### Key Patterns

**Resource Ownership:**
- All user data includes `user_id` field set to Firebase `uid`
- Queries always filter by `user_id == current_user["uid"]`
- Updates/deletes verify ownership before allowing operation

**Exercise Versions:**
- Exercise versions allow tracking different training protocols for the same exercise
- Example: "Bench Press - Strength" (5x5) vs "Bench Press - Hypertrophy" (3x10)
- Workout plans and sessions reference `exercise_version_id`, not `exercise_id`
- Analytics/progress tracked per exercise version

**Workout Sessions:**
- Active session = session without `end_time`
- Frontend checks for active session on app load
- Only one active session allowed per user
- Garmin data stored in `garmin_data` field with summary metrics and time-series

## Tech Stack

**Frontend:**
- React 19 + Vite
- Material-UI v7 (MUI)
- React Router v7
- Firebase Client SDK (Auth + App Check)
- MUI X-Charts for progress visualization
- Leaflet + react-leaflet for GPS maps
- Web Bluetooth API for heart rate monitors

**Backend:**
- Python 3.11
- FastAPI 0.124.2
- Firebase Admin SDK
- Firestore Database
- Pydantic v2 for validation
- pytest for testing
- slowapi for rate limiting
- Garmin file parsers (fitparse, gpxpy, python-tcxparser)

**Infrastructure:**
- Docker + Docker Compose
- Nginx (production frontend)
- Railway (deployment)

## Common Development Tasks

### Adding New API Endpoint

1. Create Pydantic schemas in `backend/app/schemas/{resource}.py`
2. Create router in `backend/app/api/routes/{resource}.py`
3. Register in `backend/main.py`:
```python
from app.api.routes import {resource}
app.include_router({resource}.router, prefix="/api/{resource}", tags=["{resource}"])
```
4. Use `Depends(get_current_user_with_app_check)` for protected routes
5. Write tests in `backend/tests/test_{resource}.py`

### Adding New Frontend Page

1. Create page component in `frontend/src/routes/{PageName}.jsx`
2. Import in `frontend/src/App.jsx`
3. Add route inside `<ProtectedRoute>` wrapper
4. Add navigation item to `menuItems` in `frontend/src/components/layout/Layout.jsx`
5. Use Context hooks: `useAuth()`, `useExercises()`, `useHistory()`
6. Make API calls with `authenticatedGet/Post/Patch/Delete()`

### Database Schema Changes

**Adding fields to existing collection:**
1. Update Pydantic schema in `backend/app/schemas/`
2. Update frontend API calls to include new fields
3. Update frontend components to display/edit new fields
4. Existing documents will have `null` for new fields until updated

**Adding new collection:**
1. Create schema in `backend/app/schemas/`
2. Create route in `backend/app/api/routes/`
3. Ensure `user_id` field added for user-scoped data
4. Add Firestore queries with `.where("user_id", "==", uid)`

## Testing

**Backend Testing:**
- All tests use `TestClient` from FastAPI
- Authentication mocked via dependency override in `tests/conftest.py`
- Mock user: `{"uid": "test-user-123", "email": "test@example.com"}`
- Use `auth_headers` fixture for authenticated requests
- Both `get_current_user` and `get_current_user_with_app_check` mocked
- `verify_app_check_token()` mocked to return success

**Test Fixtures:**
- `client` - FastAPI TestClient with mocked auth
- `auth_headers` - Dict with `Authorization` and `X-Firebase-AppCheck` headers
- `test_user` - Primary test user data
- `sample_exercise`, `sample_workout_plan`, `sample_workout_session` - Sample data

## Deployment

**Railway Configuration:**
- Both frontend and backend deployable to Railway
- Backend uses `Dockerfile.prod` with production Uvicorn config
- Frontend uses multi-stage build with Nginx
- Environment variables set in Railway dashboard
- Backend accepts `FIREBASE_PRIVATE_KEY_PATH` as either file path or JSON string

**Security Notes:**
- Rate limiting: 100 requests/minute per IP via slowapi
- Security headers added via middleware
- CORS configured via `ALLOWED_ORIGINS` env var
- All sensitive data in `.env` files (never committed)
- Optional audit logging via `ENABLE_AUDIT_LOGGING=true`

## File Locations

**Backend:**
- Routes: `backend/app/api/routes/`
- Schemas: `backend/app/schemas/`
- Business logic: `backend/app/services/`
- Auth/config: `backend/app/core/`
- Utilities: `backend/app/utils/`
- Tests: `backend/tests/`

**Frontend:**
- Pages: `frontend/src/routes/`
- Components: `frontend/src/components/`
- Contexts: `frontend/src/contexts/`
- API utilities: `frontend/src/utils/api.js`
- Theme: `frontend/src/theme/`
- Config: `frontend/src/config/`
