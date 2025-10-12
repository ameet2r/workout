from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Pydantic Settings automatically reads from environment variables
    FIREBASE_PROJECT_ID: str
    FIREBASE_PRIVATE_KEY_PATH: str
    ALLOWED_ORIGINS: Optional[str] = None
    ENABLE_AUDIT_LOGGING: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
