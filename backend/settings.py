from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="backend/.env", extra="ignore")

    app_name: str = "Katalog Firm Polonijnych w Szwajcarii"
    debug: bool = False  # MUST be False in production!
    cors_origins: list[str] = Field(
        default_factory=lambda: ["*"]
    )
    mapbox_token: Optional[str] = Field(default=None, validation_alias="MAPBOX_TOKEN")
    google_maps_api_key: Optional[str] = Field(default=None, validation_alias="GOOGLE_MAPS_API_KEY")
    admin_password: Optional[str] = Field(default=None, validation_alias="ADMIN_PASSWORD")


@lru_cache
def get_settings() -> Settings:
    return Settings()
