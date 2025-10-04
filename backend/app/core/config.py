from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID")
    FIREBASE_PRIVATE_KEY_PATH: str = os.getenv("FIREBASE_PRIVATE_KEY_PATH")
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
