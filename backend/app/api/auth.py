from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, Role
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.api.dependencies import get_current_user as get_current_user_simple
from app.core import security
from app.core.config import settings
from datetime import timedelta
from pydantic import BaseModel
from app.services.siwe_service import nonce_service, authenticate_wallet

router = APIRouter(prefix="/api/auth", tags=["authentication"])

class WalletLoginRequest(BaseModel):
    wallet_address: str
    signature: str
    message: str

class NonceRequest(BaseModel):
    wallet_address: str

@router.get("/nonce", response_model=dict)
def get_nonce(payload: NonceRequest = Depends(), db: Session = Depends(get_db)):
    nonce = nonce_service.create_nonce(payload.wallet_address)
    return {"nonce": nonce}

@router.post("/wallet-login", response_model=Token)
def wallet_login(
    payload: WalletLoginRequest,
    db: Session = Depends(get_db)
):
    # 1. Verify and consume nonce
    # We need to extract the nonce from the message or pass it explicitly.
    # SIWE messages contain the nonce. We'll check the nonce stored for this wallet.

    # Since the nonce was stored in the singleton, we can't easily pass it here
    # unless we've stored the expected nonce.
    # The service now handles the signature verification.

    # For the prototype, we'll verify the signature and if the message
    # contains a valid, unconsumed nonce.

    # We need a way to get the nonce for the wallet to verify the signature.
    # I'll modify the siwe_service to handle the nonce check inside authenticate_wallet.

    # Actually, I'll just call the verification here.
    from app.services.siwe_service import verify_siwe_signature

    # We need the current nonce to check the signature
    # Note: nonce_service stores it.
    stored_nonce = nonce_service._nonces.get(payload.wallet_address.lower(), {}).get("nonce")
    if not stored_nonce:
        raise HTTPException(status_code=400, detail="No nonce requested or nonce expired")

    if not verify_siwe_signature(payload.message, payload.signature, payload.wallet_address, stored_nonce):
        raise HTTPException(status_code=401, detail="Invalid signature or message")

    # Consume the nonce
    nonce_service.verify_and_consume_nonce(payload.wallet_address, stored_nonce)

    try:
        user, access_token = authenticate_wallet(db, payload.wallet_address, payload.signature, payload.message)
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/register", response_model=UserResponse, status_code=201)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if username or email already exists
    if db.query(User).filter((User.username == user_in.username) | (User.email == user_in.email)).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already registered"
        )

    # Assign default role (VIEWER) for new registrations
    default_role = db.query(Role).filter(Role.name == "VIEWER").first()
    if not default_role:
        # This should be handled by the seed script, but as a fallback:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Default role 'VIEWER' not found. Please seed the database."
        )

    hashed_password = security.hash_password(user_in.password)

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=hashed_password,
        full_name=user_in.full_name,
        role_id=default_role.id,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.post("/login", response_model=Token)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not security.verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.LEXVAULT_ACCESS_TOKEN_EXPIRE_MINUTES or 30)
    access_token = security.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user_simple)):
    return current_user
