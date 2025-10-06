from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ExerciseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    muscle_groups: List[str] = Field(default_factory=list, max_length=10)
    equipment: Optional[str] = Field(None, max_length=100)
    category: str = Field(default="strength", max_length=50)
    description: Optional[str] = Field(None, max_length=2000)


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
    created_by: str  # User ID of creator
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExerciseVersionBase(BaseModel):
    exercise_id: str
    version_name: str = Field(..., min_length=1, max_length=100)
    target_reps: Optional[str] = Field(None, max_length=20)  # e.g., "3-5" or "8-12"
    target_sets: Optional[int] = Field(None, ge=1, le=100)
    notes: Optional[str] = Field(None, max_length=2000)


class ExerciseVersionCreate(ExerciseVersionBase):
    pass


class ExerciseVersion(ExerciseVersionBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
