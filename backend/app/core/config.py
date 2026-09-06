from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
import binascii


class Settings(BaseSettings):
    PROJECT_NAME: str = "LexVault API"

    DATABASE_URL: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/lexvault"
    )

    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    MAX_UPLOAD_SIZE: int = 104857600

    UPLOADS_DIR: str = "uploads"

    # Pinata IPFS Credentials
    PINATA_JWT: str = Field(default="", validation_alias="PINATA_JWT")

    # LEXVAULT_ENCRYPTION_KEY in .env
    raw_encryption_key: str = Field(
        default="",
        validation_alias="LEXVAULT_ENCRYPTION_KEY",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def encryption_key(self) -> bytes:
        if not self.raw_encryption_key:
            raise ValueError(
                "LEXVAULT_ENCRYPTION_KEY is not configured in environment variables."
            )

        try:
            key = binascii.unhexlify(self.raw_encryption_key)
        except binascii.Error:
            raise ValueError(
                "LEXVAULT_ENCRYPTION_KEY must be a valid hexadecimal string."
            )

        if len(key) != 32:
            raise ValueError(
                "LEXVAULT_ENCRYPTION_KEY must be 32 bytes "
                "(64 hexadecimal characters). "
                f"Got {len(key)} bytes."
            )

        return key


settings = Settings()
