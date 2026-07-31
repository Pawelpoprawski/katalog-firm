from functools import lru_cache
from typing import Optional, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="backend/.env", extra="ignore", env_file_encoding="utf-8-sig")

    app_name: str = "Katalog Firm Polonijnych w Szwajcarii"
    debug: bool = False  # MUST be False in production!
    cors_origins: Union[list[str], str] = Field(
        default="*"
    )
    mapbox_token: Optional[str] = Field(default=None, validation_alias="MAPBOX_TOKEN")
    google_maps_api_key: Optional[str] = Field(default=None, validation_alias="GOOGLE_MAPS_API_KEY")
    admin_password: Optional[str] = Field(default=None, validation_alias="ADMIN_PASSWORD")
    resend_api_key: Optional[str] = Field(default=None, validation_alias="RESEND_API_KEY")
    # Publiczny adres serwisu (linki w mailach, newsletter) — na nowej instancji
    # ustaw PUBLIC_SITE_URL=https://polacyszwajcaria.com/katalog-firm
    public_site_url: str = Field(default="https://katalog-firm.ch", validation_alias="PUBLIC_SITE_URL")
    # Nadawca maili transakcyjnych (domena musi być zweryfikowana w Resend)
    email_from: str = Field(default="Katalog Firm <kontakt@katalog-firm.ch>", validation_alias="EMAIL_FROM")
    open_ai_katalog_firm: Optional[str] = Field(default=None, validation_alias="OPEN_AI_KATALOG_FIRM")
    openai_model: str = Field(default="gpt-5.6-luna", validation_alias="OPENAI_MODEL")
    
    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS_ORIGINS from comma-separated string to list."""
        if isinstance(v, str):
            # Split by comma and strip whitespace
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v if v else ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
