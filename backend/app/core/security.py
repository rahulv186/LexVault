from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

# Password hashing configuration
# Argon2id is the recommended default for passlib's argon2
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return pwd_context.hash(password)

def verify_password(plaintext_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a hash."""
    return pwd_context.verify(plaintext_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a signed JWT access token.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        settings.LEXVAULT_JWT_SECRET,
        algorithm=settings.LEXVAULT_JWT_ALGORITHM
    )

def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodes and validates a JWT access token.
    Returns the payload if valid, None otherwise.
    """
    try:
        payload = jwt.decode(
            token,
            settings.LEXVAULT_JWT_SECRET,
            algorithms=[settings.LEXVAULT_JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None
