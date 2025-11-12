from typing import List, Optional
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyUrl, field_validator

class Settings(BaseSettings):
    # Sensitive fields - MUST be set in .env.conf, no defaults
    database_url: AnyUrl | str
    secret_key: str  
    allowed_origins: str = ""
    
    # Non-sensitive fields with defaults
    algorithm: str = "HS256"
    access_token_expire_minutes: Optional[int] = 30

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env.conf"),
        env_prefix="",
        case_sensitive=False,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("access_token_expire_minutes", mode="before")
    @classmethod
    def parse_int(cls, v):
        if v == "" or v is None:
            return None
        if isinstance(v, str):
            return int(v) if v.strip() else None
        return v

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse comma-separated allowed_origins string into a list"""
        if not self.allowed_origins or not self.allowed_origins.strip():
            return []
        return [s.strip() for s in self.allowed_origins.split(",") if s.strip()]

    def model_post_init(self, __context):
        """Validate that required sensitive fields are set"""
        if not self.database_url or not str(self.database_url).strip():
            raise ValueError("DATABASE_URL is required in .env.conf file")
        if not self.secret_key or not self.secret_key.strip():
            raise ValueError("SECRET_KEY is required in .env.conf file")
settings = Settings()

DATABASE_URL = settings.database_url
SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes or 30
ALLOWED_ORIGINS = settings.allowed_origins_list
CORS_ORIGINS = settings.allowed_origins_list