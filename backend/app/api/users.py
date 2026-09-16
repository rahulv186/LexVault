from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import User, Role
from app.api.dependencies import require_permission
from app.schemas.auth import RoleResponse, UserResponse, UserCreate, UserRoleUpdate, UserStatusUpdate

router = APIRouter(prefix="/api/users", tags=["user-management"])

def serialize_role(role: Role) -> dict:
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "permissions": sorted(permission.name for permission in role.permissions),
    }

@router.get("/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:read"))
):
    return db.query(User).all()

@router.get("/roles/", response_model=List[RoleResponse])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage"))
):
    roles = db.query(Role).order_by(Role.name.asc()).all()
    return [serialize_role(role) for role in roles]

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:read"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/", response_model=UserResponse, status_code=201)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage"))
):
    if db.query(User).filter((User.username == user_in.username) | (User.email == user_in.email)).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already registered"
        )

    # Default to VIEWER role if not specified (could be added to UserCreate)
    default_role = db.query(Role).filter(Role.name == "VIEWER").first()

    from app.core.security import hash_password
    hashed_password = hash_password(user_in.password)

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=hashed_password,
        full_name=user_in.full_name,
        role_id=default_role.id if default_role else None,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.patch("/{user_id}/role")
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage"))
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Users cannot change their own role"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role_name = role_update.role_name.strip().upper()
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Role {role_name} does not exist")

    user.role_id = role.id
    db.commit()
    db.refresh(user)
    return user

@router.patch("/{user_id}/status")
def update_user_status(
    user_id: int,
    status_update: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage"))
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Users cannot change their own active status"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = status_update.is_active
    db.commit()
    db.refresh(user)
    return user
