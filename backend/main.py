from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.api.routes import auth, users, exercises, workout_plans, workout_sessions, analytics
import os
import json

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

app = FastAPI(
    title="Workout Tracker API",
    description="API for tracking workouts, exercises, and progress",
    version="1.0.0"
)

# Add middleware to handle X-Forwarded-Proto from Railway proxy
@app.middleware("http")
async def handle_proxy_headers(request: Request, call_next):
    # Trust Railway's X-Forwarded-Proto header
    forwarded_proto = request.headers.get("X-Forwarded-Proto")
    if forwarded_proto:
        request.scope["scheme"] = forwarded_proto
    response = await call_next(request)
    return response

# Register rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response

# CORS middleware
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "")
# Support both comma-separated string and JSON array format
if allowed_origins_str.startswith("["):
    # Try to parse as JSON array
    allowed_origins = json.loads(allowed_origins_str)
else:
    # Parse as comma-separated string
    allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["exercises"])
app.include_router(workout_plans.router, prefix="/api/workout-plans", tags=["workout-plans"])
app.include_router(workout_sessions.router, prefix="/api/workout-sessions", tags=["workout-sessions"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])

@app.get("/")
async def root():
    return {"message": "Workout Tracker API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
