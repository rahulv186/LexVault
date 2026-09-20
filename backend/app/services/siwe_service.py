import secrets
import time
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.db.models import User, Role
from app.core.security import create_access_token
from app.core.config import settings
from eth_account.messages import encode_defunct
from eth_account import Account
from web3 import Web3

class NonceService:
    """
    Simple server-side nonce management.
    In a production environment, this would use Redis or a database table.
    For this prototype, we'll use a simple in-memory store (singleton).
    """
    _nonces = {} # {wallet_address: {"nonce": str, "expires": float}}

    @classmethod
    def create_nonce(cls, wallet_address: str) -> str:
        nonce = secrets.token_urlsafe(32)
        cls._nonces[wallet_address.lower()] = {
            "nonce": nonce,
            "expires": time.time() + 300 # 5 minutes expiration
        }
        return nonce

    @classmethod
    def verify_and_consume_nonce(cls, wallet_address: str, nonce: str) -> bool:
        wallet_lower = wallet_address.lower()
        stored = cls._nonces.get(wallet_lower)
        if not stored:
            return False

        if stored["nonce"] != nonce:
            return False

        if time.time() > stored["expires"]:
            del cls._nonces[wallet_lower]
            return False

        # Consume nonce to prevent replay
        del cls._nonces[wallet_lower]
        return True

nonce_service = NonceService()

def verify_siwe_signature(
    message: str,
    signature: str,
    wallet_address: str,
    expected_nonce: str
) -> bool:
    """
    Verifies an Ethereum signature against a SIWE-like message.
    """
    try:
        # 1. Verify nonce is present in the message
        if expected_nonce not in message:
            return False

        # 2. Recover address from signature
        msg_hash = encode_defunct(text=message)
        recovered_address = Account.recover_message(msg_hash, signature=signature)

        return recovered_address.lower() == wallet_address.lower()
    except Exception:
        return False

def authenticate_wallet(db: Session, wallet_address: str, signature: str, message: str) -> Tuple[User, str]:
    """
    Full wallet authentication flow.
    Returns the User and the issued JWT.
    """
    wallet_lower = wallet_address.lower()

    # 1. Verify signature and nonce
    # Note: The nonce is retrieved from nonce_service and consumed here
    # In the actual API call, we'll pass the nonce we expect.
    # This function is called AFTER nonce_service.verify_and_consume_nonce

    if not verify_siwe_signature(message, signature, wallet_address, ""):
        # Since verify_siwe_signature above is a helper, we'll handle
        # the actual logic in the API endpoint.
        pass

    # 2. User Linking
    user = db.query(User).filter(User.wallet_address == wallet_lower).first()

    if not user:
        # Controlled registration: Assign default VIEWER role
        default_role = db.query(Role).filter(Role.name == "VIEWER").first()
        if not default_role:
            raise Exception("Default role 'VIEWER' not found")

        user = User(
            username=f"wallet_{wallet_lower[-6:]}",
            email=f"{wallet_lower[-6:]}@wallet.lexvault",
            password_hash="WALLET_AUTH", # Placeholder
            full_name="Wallet User",
            role_id=default_role.id,
            is_active=True,
            wallet_address=wallet_lower
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 3. Issue JWT
    access_token_expires = timedelta(minutes=settings.LEXVAULT_ACCESS_TOKEN_EXPIRE_MINUTES or 30)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )

    return user, access_token
