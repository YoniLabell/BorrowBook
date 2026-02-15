from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "BorrowBook"
    DEBUG: bool = False

    # Database — prefer internal URL on Render (paid plans), fall back to external
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/borrowbook"
    DATABASE_INTERNAL_URL: Optional[str] = None

    # JWT
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # S3 / R2
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET_NAME: str = "borrowbook"
    S3_REGION: str = "auto"
    S3_PUBLIC_URL: Optional[str] = None  # Public URL prefix for objects

    # OCR (OCR.Space free tier)
    OCR_SPACE_API_KEY: Optional[str] = None

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Upload limits
    MAX_IMAGE_SIZE_MB: int = 5
    MAX_IMAGES_PER_LISTING: int = 5

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # Sentinel used when no real DB URL is available (first Render deploy)
    _FALLBACK_DB_URL = "postgresql+asyncpg://localhost/borrowbook"

    @property
    def effective_database_url(self) -> str:
        """Use internal URL if available (Render paid), else external.

        Returns a valid-looking URL even when DATABASE_URL is empty so the
        app can start (health check passes).  Actual DB calls will fail
        until a real URL is set and the service is redeployed.
        """
        for candidate in (self.DATABASE_INTERNAL_URL, self.DATABASE_URL):
            if candidate and candidate.strip():
                return candidate.strip()
        return self._FALLBACK_DB_URL

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
