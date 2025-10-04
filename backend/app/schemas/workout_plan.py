from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class PlannedExercise(BaseModel):
    exercise_version_id: str
    order: int
    planned_sets: Optional[int] = None
    planned_reps: Optional[str] = None  # e.g., "3-5" or "8-12"
    planned_weight: Optional[float] = None


class WorkoutPlanBase(BaseModel):
    name: str
    exercises: List[PlannedExercise] = []
    notes: Optional[str] = None


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
