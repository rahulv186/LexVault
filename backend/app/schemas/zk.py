from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class ZKProofCreateRequest(BaseModel):
    evidence_id: str


class ZKProofResponse(BaseModel):
    id: int
    proof_id: str
    evidence_public_id: str
    circuit_name: str
    circuit_version: str
    proving_system: str
    public_inputs: dict[str, Any]
    public_signals: list[Any]
    status: str
    verification_result: Optional[bool] = None
    created_at: datetime
    verified_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ZKVerifyRequest(BaseModel):
    proof: Optional[dict[str, Any]] = None
    public_signals: Optional[list[Any]] = None


class ZKVerifyResponse(BaseModel):
    proof_id: str
    valid: bool
    status: str
    verified_at: datetime
