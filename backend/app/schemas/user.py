from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    display_name: Optional[str] = None


class User(UserBase):
    uid: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
