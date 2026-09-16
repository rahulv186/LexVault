from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.db.database import get_db
from app.db.models import User, ZKProof
from app.schemas.zk import ZKProofCreateRequest, ZKProofResponse, ZKVerifyRequest, ZKVerifyResponse
from app.services.zk_service import ZKServiceError, zk_service


router = APIRouter(prefix="/api/zk", tags=["zero-knowledge-proofs"])


def serialize_proof(proof: ZKProof) -> dict:
    return {
        "id": proof.id,
        "proof_id": proof.proof_id,
        "evidence_public_id": proof.evidence.evidence_id,
        "circuit_name": proof.circuit_name,
        "circuit_version": proof.circuit_version,
        "proving_system": proof.proving_system,
        "public_inputs": proof.public_inputs,
        "public_signals": proof.public_signals,
        "status": proof.status,
        "verification_result": proof.verification_result,
        "created_at": proof.created_at,
        "verified_at": proof.verified_at,
    }


@router.get("/proofs/", response_model=list[ZKProofResponse])
def list_zk_proofs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("zk:verify")),
):
    return [serialize_proof(proof) for proof in zk_service.list_proofs(db)]


@router.post("/proofs/", response_model=ZKProofResponse, status_code=201)
def generate_zk_proof(
    request: ZKProofCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("zk:generate")),
):
    try:
        proof = zk_service.generate_proof(db, request.evidence_id)
    except ZKServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    if not proof:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    return serialize_proof(proof)


@router.post("/proofs/{proof_id}/verify/", response_model=ZKVerifyResponse)
def verify_zk_proof(
    proof_id: str,
    request: ZKVerifyRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("zk:verify")),
):
    try:
        result = zk_service.verify_proof(
            db,
            proof_id,
            proof_override=request.proof if request else None,
            public_signals_override=request.public_signals if request else None,
            persist_result=not (request and (request.proof is not None or request.public_signals is not None)),
        )
    except ZKServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    if result is None:
        raise HTTPException(status_code=404, detail="ZK proof not found")

    return result
