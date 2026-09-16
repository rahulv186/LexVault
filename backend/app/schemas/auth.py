from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role_name: str
    permissions: list[str] = []
    is_active: bool

    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    role_name: str

class UserStatusUpdate(BaseModel):
    is_active: bool

class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    permissions: list[str] = []
