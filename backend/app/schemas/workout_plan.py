from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class Timer(BaseModel):
    duration: int = Field(..., ge=1, le=86400)  # Duration in seconds (max 24 hours)
    type: str = Field(..., pattern="^(total|per_set)$")  # "total" or "per_set"


class PlannedExercise(BaseModel):
    exercise_version_id: str
    order: int = Field(..., ge=0)
    planned_sets: Optional[int] = Field(None, ge=1, le=100)
    planned_reps: Optional[str] = Field(None, max_length=20)  # e.g., "3-5" or "8-12"
    planned_weight: Optional[float] = Field(None, ge=0, le=10000)
    is_bodyweight: Optional[bool] = False
    instruction: Optional[str] = Field(None, max_length=1000)
    timers: Optional[List[Timer]] = Field(default_factory=list, max_length=10)


class WorkoutPlanBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    exercises: List[PlannedExercise] = Field(default_factory=list, max_length=50)
    notes: Optional[str] = Field(None, max_length=5000)


class WorkoutPlanCreate(WorkoutPlanBase):
    pass


class WorkoutPlanUpdate(BaseModel):
    name: Optional[str] = None
    exercises: Optional[List[PlannedExercise]] = None
    notes: Optional[str] = None


class WorkoutPlan(WorkoutPlanBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
