from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "Health Check System"
    DEBUG: bool = False

    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL: int = 10

    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    DATABASE_URL: Optional[str] = None

    ENCRYPTION_KEY: str = "change-this-to-a-secure-random-key-32c"
    SECRET_KEY: str = "change-this-to-another-secure-key-32ch"

    SSH_TIMEOUT: int = 30
    SSH_CONNECT_TIMEOUT: int = 10

    API_TIMEOUT: int = 30
    API_RETRY_COUNT: int = 3


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
