from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Pydantic Settings automatically reads from environment variables
    FIREBASE_PROJECT_ID: str
    FIREBASE_PRIVATE_KEY_PATH: str

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
