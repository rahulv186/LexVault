from sqlalchemy import Column, Integer, String, DateTime, BigInteger, Index
from sqlalchemy.sql import func
from app.db.database import Base

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

    # Index for SHA256 is already handled by index=True
