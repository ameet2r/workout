# Workout Tracker

A full-stack workout tracking application with React frontend and FastAPI backend, using Firebase for authentication and Firestore for data storage.

## Project Overview

This application helps you track your workouts, monitor progress, and manage exercise routines. Key features include:

- **Workout Plans**: Create custom workout plans with exercises, sets, reps, and weights
- **Exercise Versions**: Track different variations of exercises (e.g., strength vs hypertrophy)
- **Live Workout Tracking**: Adjust weights and reps in real-time during workouts
- **Progress Analytics**: View charts showing progress over time, personal records, and volume
- **Garmin Integration**: Input Garmin workout data for comprehensive tracking
- **Historical Max Display**: See your previous maxes when planning workouts

## Tech Stack

### Frontend
- React 18 + Vite
- Material-UI (MUI)
- React Router v6
- Firebase Authentication
- MUI X-Charts

### Backend
- Python 3.11
- FastAPI
- Firebase Admin SDK
- Firestore Database
- Pydantic for validation

### Infrastructure
- Docker & Docker Compose
- Nginx (production frontend)
- Railway (deployment ready)

## Project Structure

```
workout/
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/routes/   # API endpoints
│   │   ├── core/         # Auth, config, Firebase
│   │   ├── schemas/      # Pydantic models
│   │   └── services/     # Business logic
│   ├── Dockerfile.dev    # Development Docker image
│   ├── Dockerfile.prod   # Production Docker image
│   └── docker-compose.yaml
│
└── frontend/             # React frontend
    ├── src/
    │   ├── components/   # React components
    │   ├── contexts/     # Context providers
    │   ├── routes/       # Page components
    │   ├── utils/        # API utilities
    │   └── theme/        # MUI theme
    ├── Dockerfile        # Production image
    ├── Dockerfile.dev    # Development image
    └── compose.yaml
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- Firebase project with:
  - Authentication enabled
  - Firestore database
  - Service account key (JSON file)

### Setup

1. **Clone and navigate to project**:
```bash
cd workout
```

2. **Backend Setup**:
```bash
cd backend
cp .env.example .env
# Edit .env with your Firebase credentials
```

Required backend `.env` variables:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_PATH=/path/to/serviceAccountKey.json
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

3. **Frontend Setup**:
```bash
cd ../frontend
cp .env.example .env
# Edit .env with your Firebase config
```

Required frontend `.env` variables:
```
VITE_BACKEND_API=http://localhost:8000
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Running with Docker (Recommended)

#### Development Mode

**Backend**:
```bash
cd backend
docker compose up
```
API available at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

**Frontend**:
```bash
cd frontend
docker compose up frontend-dev
```
App available at `http://localhost:5173`

#### Production Mode

**Backend**:
```bash
cd backend
docker build -f Dockerfile.prod -t workout-backend .
docker run -p 8000:8000 --env-file .env workout-backend
```

**Frontend**:
```bash
cd frontend
docker compose up frontend-prod
```
App available at `http://localhost:3000`

### Running Locally (Without Docker)

**Backend**:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

## Database Schema

### Firestore Collections

- **users**: User profiles with email and display name
- **exercises**: Exercise definitions (name, muscle groups, equipment)
- **exercise_versions**: User-specific exercise variations (strength, hypertrophy, etc.)
- **workout_plans**: Saved workout templates with exercises
- **workout_sessions**: Completed workouts with sets, reps, weights, and Garmin data

## API Endpoints

See `backend/README.md` for full API documentation.

Key endpoints:
- `POST /api/auth/register` - Register user
- `GET /api/auth/me` - Get current user
- `GET /api/exercises/` - List exercises
- `POST /api/workout-plans/` - Create workout plan
- `POST /api/workout-sessions/` - Start workout session
- `GET /api/analytics/progress/{exercise_version_id}` - Get progress data

## Development Workflow

1. **Start backend** in one terminal:
```bash
cd backend && docker compose up
```

2. **Start frontend** in another terminal:
```bash
cd frontend && docker compose up frontend-dev
```

3. **Access the app** at `http://localhost:5173`

4. **API docs** available at `http://localhost:8000/docs`

## Deployment

Both frontend and backend are configured for Railway deployment:

- Backend uses `Dockerfile.prod` with Railway-specific environment variables
- Frontend uses multi-stage build with Nginx
- Environment variables must be set in Railway dashboard

## Features Roadmap

### Phase 1 (MVP)
- [x] User authentication
- [x] Basic workout plan creation
- [ ] Active workout tracking
- [ ] View workout history

### Phase 2
- [ ] Exercise versions
- [ ] Progress charts
- [ ] Garmin data input

### Phase 3
- [ ] 1RM calculator
- [ ] Plate calculator
- [ ] Rest timer
- [ ] Progressive overload suggestions

### Phase 4
- [ ] Body metrics tracking
- [ ] Workout templates
- [ ] Mobile PWA
- [ ] Dark mode

## License

Private project - All rights reserved
