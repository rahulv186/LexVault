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

    # JWT Authentication
    LEXVAULT_JWT_SECRET: str = Field(
        default="",
        validation_alias="LEXVAULT_JWT_SECRET",
    )

    # Blockchain configuration
    ETH_RPC_URL: str = Field(
        default="https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
        validation_alias="ETH_RPC_URL",
    )
    MULTISIG_CONTRACT_ADDRESS: str = Field(
        default="0x0000000000000000000000000000000000000000",
        validation_alias="MULTISIG_CONTRACT_ADDRESS",
    )

    LEXVAULT_JWT_ALGORITHM: str = Field(
        default="HS256",
        validation_alias="LEXVAULT_JWT_ALGORITHM",
    )

    LEXVAULT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        validation_alias="LEXVAULT_ACCESS_TOKEN_EXPIRE_MINUTES",
    )

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