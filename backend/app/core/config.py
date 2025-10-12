from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union


class Settings(BaseSettings):
    # Pydantic Settings automatically reads from environment variables
    FIREBASE_PROJECT_ID: str
    FIREBASE_PRIVATE_KEY_PATH: str
    ALLOWED_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v) -> List[str]:
        """Parse ALLOWED_ORIGINS from comma-separated string or JSON array"""
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
