from functools import lru_cache
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "AKTU Stream AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database & Redis
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/aktu_stream"
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI & Gemini API
    GEMINI_API_KEY: str = Field(default="", description="Gemini API Key for 2-stage verification")
    GEMINI_MODEL: str = "gemini-3.8-flash"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    CLASSIFIER_CONFIDENCE_THRESHOLD: float = 0.70

    # YouTube Data API v3 (Strict Quota: ONLY playlistItems.list & videos.list)
    YOUTUBE_API_KEY: str = Field(default="", description="YouTube Data API v3 key")
    YOUTUBE_DAILY_QUOTA_LIMIT: int = 10000
    YOUTUBE_QUOTA_ALERT_THRESHOLD: int = 8500

    # Object Storage (Cloudflare R2 / AWS S3 / MinIO)
    STORAGE_BACKEND: str = "s3"
    S3_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY_ID: str = "minioadmin"
    S3_SECRET_ACCESS_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "aktu-stream-videos"
    S3_REGION_NAME: str = "us-east-1"
    S3_PUBLIC_URL_PREFIX: str = "http://localhost:9000/aktu-stream-videos"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    # Content Taxonomy
    RESERVED_AI_CODE: str = "AI_GENERAL"
    MIN_UNIT_NUMBER: int = 1
    MAX_UNIT_NUMBER: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()
