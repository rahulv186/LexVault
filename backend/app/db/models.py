from sqlalchemy import Column, Integer, String, DateTime, BigInteger, Index, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class RolePermission(Base):
    __tablename__ = "role_permissions"
    role_id = Column(Integer, ForeignKey("roles.id"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), primary_key=True)

class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String)

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String)

    users = relationship("User", back_populates="role")
    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, server_default="true", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    role = relationship("Role", back_populates="users")

# Update Permission to link back to Role
Permission.roles = relationship("Role", secondary="role_permissions", back_populates="permissions")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(String, unique=True, index=True, nullable=False)
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)
    mime_type = Column(String)
    file_size = Column(BigInteger, nullable=False)
    sha256 = Column(String, index=True, nullable=False)
    uploaded_by = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    verification_status = Column(String, server_default="pending", nullable=False)

    # Encryption Metadata
    encryption_algorithm = Column(String)
    encryption_nonce = Column(String)
    encrypted_file_size = Column(BigInteger)

    # IPFS Metadata
    ipfs_cid = Column(String, index=True)
    ipfs_uploaded_at = Column(DateTime(timezone=True))
    ipfs_status = Column(String, server_default="pending")

    # Relationships
    custody_events = relationship("CustodyEvent", back_populates="evidence", cascade="all, delete-orphan")

class CustodyEvent(Base):
    __tablename__ = "custody_events"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(Integer, ForeignKey("evidence.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False)
    actor = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    description = Column(String, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    previous_event_hash = Column(String, nullable=True)
    event_hash = Column(String, nullable=False, index=True)

    # Relationships
    evidence = relationship("Evidence", back_populates="custody_events")
