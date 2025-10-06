from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ExerciseBase(BaseModel):
    name: str
    muscle_groups: List[str] = []
    equipment: Optional[str] = None
    category: str = "strength"
    description: Optional[str] = None


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    muscle_groups: Optional[List[str]] = None
    equipment: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class Exercise(ExerciseBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExerciseVersionBase(BaseModel):
    exercise_id: str
    version_name: str
    target_reps: Optional[str] = None  # e.g., "3-5" or "8-12"
    target_sets: Optional[int] = None
    notes: Optional[str] = None


class ExerciseVersionCreate(ExerciseVersionBase):
    pass


class ExerciseVersion(ExerciseVersionBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
