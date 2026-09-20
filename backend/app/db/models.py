from sqlalchemy import Column, Integer, String, DateTime, BigInteger, Index, ForeignKey, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
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

    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")

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
    wallet_address = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    role = relationship("Role", back_populates="users")

    @property
    def role_name(self) -> str:
        return self.role.name if self.role else ""

    @property
    def permissions(self) -> list[str]:
        if not self.role:
            return []
        return sorted(permission.name for permission in self.role.permissions)

class Case(Base):
    __tablename__ = "cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_number = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String)
    status = Column(String, server_default="OPEN", nullable=False) # OPEN, CLOSED, ARCHIVED
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Multi-Signature Access Control
    multisig_address = Column(String, nullable=True)
    multisig_threshold = Column(Integer, nullable=True)

    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("CaseMember", back_populates="case", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")

class CaseMember(Base):
    __tablename__ = "case_members"

    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    role = Column(String, nullable=False) # Lead, Member
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    case = relationship("Case", back_populates="members")
    user = relationship("User")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evidence_id = Column(String, unique=True, index=True, nullable=False)
    original_filename = Column(String, nullable=False)
    mime_type = Column(String)
    file_size = Column(BigInteger, nullable=False)
    sha256 = Column(String, index=True, nullable=False)
    uploaded_by = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    verification_status = Column(String, server_default="pending", nullable=False)

    # Secure Storage Metadata
    wrapped_dek = Column(String, nullable=False)
    storage_provider = Column(String, nullable=False, server_default="local")
    storage_ref = Column(String, nullable=False)
    encryption_version = Column(Integer, nullable=False, server_default="1")
    encrypted_file_size = Column(BigInteger)

    # Case Relationship
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=True)
    case = relationship("Case", back_populates="evidence")

    # Relationships
    custody_events = relationship("CustodyEvent", back_populates="evidence", cascade="all, delete-orphan")

class CustodyEvent(Base):
    __tablename__ = "custody_events"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("evidence.id"), nullable=True, index=True)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=True, index=True)
    event_type = Column(String, nullable=False)
    actor = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    description = Column(String, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    previous_event_hash = Column(String, nullable=True)
    event_hash = Column(String, nullable=False, index=True)

    # Relationships
    evidence = relationship("Evidence", back_populates="custody_events")
    case = relationship("Case")

class ZKProof(Base):
    __tablename__ = "zk_proofs"

    id = Column(Integer, primary_key=True, index=True)
    proof_id = Column(String, unique=True, index=True, nullable=False)
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("evidence.id"), nullable=False, index=True)
    circuit_name = Column(String, nullable=False)
    circuit_version = Column(String, nullable=False)
    proving_system = Column(String, nullable=False)
    public_inputs = Column(JSON, nullable=False)
    public_signals = Column(JSON, nullable=False)
    proof_data = Column(JSON, nullable=False)
    status = Column(String, server_default="GENERATED", nullable=False)
    verification_result = Column(Boolean, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    evidence = relationship("Evidence")

class EvidenceAccess(Base):
    __tablename__ = "evidence_access"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("evidence.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String, nullable=False)
    granted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    request_id = Column(String, nullable=False) # On-chain request ID

    evidence = relationship("Evidence")
    user = relationship("User")
