from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from uuid import UUID

class EvidenceBase(BaseModel):
    original_filename: str
    uploaded_by: str

class EvidenceCreate(EvidenceBase):
    pass

class EvidenceResponse(BaseModel):
    id: UUID
    evidence_id: str
    original_filename: str
    mime_type: Optional[str]
    file_size: int
    sha256: str
    uploaded_by: str
    uploaded_at: datetime
    verification_status: str
    wrapped_dek: str
    storage_provider: str
    storage_ref: str
    encryption_version: int
    encrypted_file_size: Optional[int]
    case_id: Optional[UUID]

    model_config = ConfigDict(from_attributes=True)

class EvidenceListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[EvidenceResponse]

class VerificationResponse(BaseModel):
    verified: bool
    status: str
    message: str
    original_hash: Optional[str] = None
    current_hash: Optional[str] = None
