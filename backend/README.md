# Workout Tracker Backend

FastAPI backend for the Workout Tracker application.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up Firebase:
   - Create a Firebase project
   - Enable Firestore
   - Enable Firebase Authentication
   - Download the service account key JSON file
   - Place it in a secure location

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your Firebase credentials:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_PATH=/path/to/serviceAccountKey.json
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Run Development Server

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

API docs available at `http://localhost:8000/docs`

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── routes/          # API endpoints
│   ├── core/                # Core functionality (auth, config, firebase)
│   ├── models/              # Data models
│   ├── schemas/             # Pydantic schemas
│   └── services/            # Business logic
├── main.py                  # Application entry point
└── requirements.txt         # Python dependencies
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user profile

### Users
- `GET /api/users/{user_id}` - Get user profile
- `PATCH /api/users/{user_id}` - Update user profile

### Exercises
- `POST /api/exercises/` - Create exercise
- `GET /api/exercises/` - List exercises
- `GET /api/exercises/{id}` - Get exercise
- `POST /api/exercises/versions` - Create exercise version
- `GET /api/exercises/versions/my-versions` - List user's exercise versions
- `GET /api/exercises/{id}/versions` - List versions for exercise

### Workout Plans
- `POST /api/workout-plans/` - Create workout plan
- `GET /api/workout-plans/` - List workout plans
- `GET /api/workout-plans/{id}` - Get workout plan
- `PATCH /api/workout-plans/{id}` - Update workout plan
- `DELETE /api/workout-plans/{id}` - Delete workout plan

### Workout Sessions
- `POST /api/workout-sessions/` - Start workout session
- `GET /api/workout-sessions/` - List workout sessions
- `GET /api/workout-sessions/{id}` - Get workout session
- `PATCH /api/workout-sessions/{id}` - Update workout session
- `POST /api/workout-sessions/{id}/complete` - Complete workout session

### Analytics
- `GET /api/analytics/progress/{exercise_version_id}` - Get exercise progress
- `GET /api/analytics/records/{exercise_version_id}` - Get personal records
- `GET /api/analytics/summary` - Get workout summary

## Deployment

For Railway deployment:
1. Connect your GitHub repository
2. Add environment variables in Railway dashboard
3. Deploy
