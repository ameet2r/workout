# Workout Tracker Frontend
 
React + Vite frontend application for tracking workouts, exercises, and fitness progress.

## Features

- **Authentication**: Firebase Authentication with email/password
- **Workout Plans**: Create and manage workout plans with exercises
- **Active Workout Tracking**: Track sets, reps, and weights during workouts
- **Progress Analytics**: View progress charts and personal records
- **Exercise Library**: Manage exercises and exercise versions
- **Workout History**: View past workout sessions

## Tech Stack

- **Framework**: React 18 with Vite
- **UI Library**: Material-UI (MUI)
- **Routing**: React Router v6
- **Authentication**: Firebase Auth
- **Charts**: MUI X-Charts
- **State Management**: React Context API

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for containerized development)

### Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Update `.env` with your Firebase credentials and backend API URL:
```
VITE_BACKEND_API=http://localhost:8000
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Running Locally (Without Docker)

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Running with Docker

#### Development Mode
```bash
docker compose up frontend-dev
```
Access at `http://localhost:5173`

#### Production Mode
```bash
docker compose up frontend-prod
```
Access at `http://localhost:3000`

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/          # Authentication components
│   │   ├── layout/        # Layout components (drawer, navbar)
│   │   └── workout/       # Workout-specific components
│   ├── contexts/          # React Context providers
│   ├── routes/            # Page components
│   ├── utils/             # Utility functions (API calls, etc.)
│   ├── theme/             # MUI theme configuration
│   ├── config/            # Firebase and other configs
│   ├── App.jsx            # Main app component
│   └── main.jsx           # Entry point
├── Dockerfile             # Production Docker image
├── Dockerfile.dev         # Development Docker image
├── compose.yaml           # Docker Compose configuration
└── vite.config.js         # Vite configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## API Integration

The frontend communicates with the FastAPI backend using authenticated API calls. All API utilities are in `src/utils/api.js`:

- `authenticatedGet(endpoint)`
- `authenticatedPost(endpoint, data)`
- `authenticatedPatch(endpoint, data)`
- `authenticatedDelete(endpoint)`

All requests automatically include the Firebase ID token in the Authorization header.

## Docker Deployment

The production Dockerfile uses a multi-stage build:
1. **Build stage**: Installs dependencies and builds the app
2. **Nginx stage**: Serves the built static files with Nginx

Build arguments for environment variables are required during build:
```bash
docker build \
  --build-arg VITE_BACKEND_API=https://api.example.com \
  --build-arg VITE_FIREBASE_API_KEY=your-key \
  # ... other Firebase config
  -t workout-tracker-frontend .
```
