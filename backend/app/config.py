import os
from dataclasses import dataclass
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "postgresql+psycopg://taskflow:taskflow@localhost/taskflow")
    jwt_secret: str = os.getenv("JWT_SECRET", "")
    access_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    refresh_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    cookie_secure: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    origins: tuple = tuple(x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","))
    timezone: str = os.getenv("BUSINESS_TIMEZONE", "UTC")


settings = Settings()
if len(settings.jwt_secret) < 32 or settings.jwt_secret.startswith("replace-with"):
    raise RuntimeError("Set JWT_SECRET to a random value of at least 32 characters.")
ZoneInfo(settings.timezone)
