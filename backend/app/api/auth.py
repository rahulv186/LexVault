from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, Role
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.core import security
from app.core.config import settings
from datetime import timedelta

router = APIRouter(prefix="/api/auth", tags=["authentication"])

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

    # We need to return role_name in UserResponse
    return {
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role_name": default_role.name,
        "is_active": new_user.is_active
    }

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user account",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create JWT
    access_token_expires = timedelta(minutes=settings.LEXVAULT_ACCESS_TOKEN_EXPIRE_MINUTES or 30)
    access_token = security.create_access_token(
        data={"sub": str(user.id), "role": user.role.name},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user_simple)):
    # We use a simplified version of get_current_user that doesn't depend on db if needed,
    # but for now let's just use the one from dependencies.
    # Wait, I should probably define a simpler one or just use the standard one.
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role_name": current_user.role.name,
        "is_active": current_user.is_active
    }

# Helper for /me to avoid circular dependency or redundant DB calls if needed
from app.api.dependencies import get_current_user as get_current_user_simple
