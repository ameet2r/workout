from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class SetData(BaseModel):
    reps: int
    weight: Optional[float] = None
    completed_at: datetime
    rpe: Optional[int] = None  # Rate of Perceived Exertion (1-10)
    notes: Optional[str] = None


class SessionExercise(BaseModel):
    exercise_version_id: str
    sets: List[SetData] = []


class GarminData(BaseModel):
    avg_heart_rate: Optional[int] = None
    max_heart_rate: Optional[int] = None
    calories: Optional[int] = None
    duration: Optional[int] = None  # in seconds
    distance: Optional[float] = None  # in meters
    raw_data: Optional[Dict[str, Any]] = None


class WorkoutSessionBase(BaseModel):
    workout_plan_id: Optional[str] = None
    exercises: List[SessionExercise] = []
    notes: Optional[str] = None


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
    garmin_data: Optional[GarminData] = None

    class Config:
        from_attributes = True
