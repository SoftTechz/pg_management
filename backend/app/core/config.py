from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

APP_DIR = Path(__file__).resolve().parents[1]
FIREBASE_DIR = APP_DIR / "firebase"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Brindavan Elite PG for Gents"
    environment: str = "local"
    backend_cors_origins: tuple[str, ...] = ("*",)
    firebase_credentials_path: str | None = None
    firebase_credentials_json: str | None = None
    firebase_storage_bucket: str | None = None
    default_owner_pin: str = Field(default="1234", pattern=r"^\d{4}$")

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip() for origin in self.backend_cors_origins if origin.strip()
        ]

    @property
    def resolved_firebase_credentials_path(self) -> str | None:
        if self.firebase_credentials_path:
            configured_path = Path(self.firebase_credentials_path)
            if not configured_path.is_absolute():
                configured_path = (Path.cwd() / configured_path).resolve()
            if configured_path.is_file():
                return str(configured_path)
            return None

        credential_candidates = [
            *sorted(FIREBASE_DIR.glob("*.json")),
            APP_DIR / "core" / "firebase_adminsdk.json",
            APP_DIR / "core" / "firebase_admin_sdk.json",
        ]
        for credential_path in credential_candidates:
            if credential_path.is_file():
                return str(credential_path)
        return None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
