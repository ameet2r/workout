from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class SetData(BaseModel):
    reps: int = Field(..., ge=0, le=1000)
    weight: Optional[float] = Field(None, ge=0, le=10000)
    completed_at: datetime
    rpe: Optional[int] = Field(None, ge=1, le=10)  # Rate of Perceived Exertion (1-10)
    notes: Optional[str] = Field(None, max_length=500)


class SessionExercise(BaseModel):
    exercise_version_id: str
    sets: List[SetData] = Field(default_factory=list, max_length=100)


class GarminData(BaseModel):
    avg_heart_rate: Optional[int] = Field(None, ge=0, le=300)
    max_heart_rate: Optional[int] = Field(None, ge=0, le=300)
    calories: Optional[int] = Field(None, ge=0, le=100000)
    duration: Optional[int] = Field(None, ge=0, le=86400)  # in seconds (max 24 hours)
    distance: Optional[float] = Field(None, ge=0, le=1000000)  # in meters
    raw_data: Optional[Dict[str, Any]] = None


class WorkoutSessionBase(BaseModel):
    workout_plan_id: Optional[str] = None
    exercises: List[SessionExercise] = Field(default_factory=list, max_length=50)
    notes: Optional[str] = Field(None, max_length=5000)
    garmin_data: Optional[GarminData] = None


class WorkoutSessionCreate(WorkoutSessionBase):
    pass


class WorkoutSessionUpdate(BaseModel):
    exercises: Optional[List[SessionExercise]] = None
    garmin_data: Optional[GarminData] = None
    notes: Optional[str] = None
    end_time: Optional[datetime] = None


class WorkoutSession(WorkoutSessionBase):
    id: str
    user_id: str
    start_time: datetime
    end_time: Optional[datetime] = None

    class Config:
        from_attributes = True
