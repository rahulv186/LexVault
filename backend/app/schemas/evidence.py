from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class EvidenceBase(BaseModel):
    original_filename: str
    uploaded_by: str

class EvidenceCreate(EvidenceBase):
    pass

class EvidenceResponse(BaseModel):
    id: int
    evidence_id: str
    original_filename: str
    stored_filename: str
    mime_type: Optional[str]
    file_size: int
    sha256: str
    uploaded_by: str
    uploaded_at: datetime
    verification_status: str

    model_config = ConfigDict(from_attributes=True)

class EvidenceListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[EvidenceResponse]

class VerificationResponse(BaseModel):
    verified: bool
    status: str
    original_hash: str
    current_hash: str
    message: str
