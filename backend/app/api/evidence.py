from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.db.database import get_db
from app.schemas.evidence import EvidenceResponse, EvidenceListResponse, VerificationResponse
from app.services import evidence_service
from app.core.config import settings
from app.db.models import Evidence, User, EvidenceAccess
from app.api.dependencies import get_current_user, require_permission
from app.services.encryption_service import FramingViolationError
from app.services.blockchain_service import blockchain_service
from pydantic import BaseModel

class GrantAccessRequest(BaseModel):
    request_id: str
    action: str # e.g., "READ", "DOWNLOAD"

router = APIRouter(prefix="/api/evidence", tags=["evidence"])

@router.get("/stats/", response_model=None)
def get_evidence_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("evidence:read"))
):
    total = db.query(func.count(Evidence.id)).scalar() or 0
    verified = db.query(func.count(Evidence.id)).filter(Evidence.verification_status == "verified").scalar() or 0
    pending = db.query(func.count(Evidence.id)).filter(Evidence.verification_status == "pending").scalar() or 0
    tampered = db.query(func.count(Evidence.id)).filter(Evidence.verification_status == "tampered").scalar() or 0

    return {
        "total": total,
        "verified": verified,
        "pending": pending,
        "tampered": tampered
    }

@router.post("/upload/", response_model=EvidenceResponse, status_code=201)
async def upload_evidence(
    file: UploadFile = File(...),
    case_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("evidence:create"))
):
    try:
        # Convert case_id to UUID if provided
        parsed_case_id = None
        if case_id:
            try:
                import uuid
                parsed_case_id = uuid.UUID(case_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid Case ID format")

        evidence = evidence_service.create_evidence_streaming(
            db,
            file,
            current_user.username,
            case_id=parsed_case_id
        )
        return evidence
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/", response_model=EvidenceListResponse)
def get_evidence(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("evidence:read"))
):
    total, items = evidence_service.get_evidence_list(
        db, page=page, page_size=page_size, status=status, search=search, evidence_type=type
    )
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items
    }

@router.get("/{evidence_id}/", response_model=EvidenceResponse)
def get_evidence_by_id(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("evidence:read"))
):
    evidence = evidence_service.get_evidence_by_id(db, evidence_id)
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence record not found")
    return evidence

@router.get("/{evidence_id}/download", response_class=StreamingResponse)
def download_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("evidence:read"))
):
    """
    Authenticated download and decryption stream.
    """
    try:
        stream = evidence_service.download_evidence_streaming(db, evidence_id)
        return StreamingResponse(stream, media_type="application/octet-stream")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FramingViolationError as e:
        raise HTTPException(status_code=500, detail=f"Integrity failure: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@router.post("/{evidence_id}/verify/", response_model=VerificationResponse)
async def verify_evidence(
    evidence_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("evidence:verify"))
):
    result = evidence_service.verify_evidence_integrity(db, evidence_id, file, current_user.username)
    if result is None:
        raise HTTPException(status_code=404, detail="Evidence record not found")
    return result

@router.post("/{evidence_id}/verify-stored/", response_model=VerificationResponse)
async def verify_stored_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("evidence:verify"))
):
    """
    Verifies the integrity of the stored encrypted evidence by decrypting it.
    """
    result = evidence_service.verify_stored_evidence_integrity(db, evidence_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Evidence record not found")
    return result

@router.get("/{evidence_id}/custody/", response_model=None)
def get_evidence_custody(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("evidence:custody:read"))
):
    from app.services.custody_service import custody_service
    evidence = evidence_service.get_evidence_by_id(db, evidence_id)
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    events = custody_service.get_custody_chain(db, evidence_id)

    formatted_events = []
    for e in events:
        formatted_events.append({
            "event_type": e.event_type,
            "actor": e.actor,
            "timestamp": e.timestamp.isoformat() if hasattr(e.timestamp, 'isoformat') else e.timestamp,
            "description": e.description,
            "previous_event_hash": e.previous_event_hash,
            "event_hash": e.event_hash,
            "metadata": e.metadata_json
        })

    return {
        "evidence_id": evidence.evidence_id,
        "events": formatted_events
    }

@router.post("/{evidence_id}/custody/verify/", response_model=None)
def verify_custody_chain(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("evidence:custody:verify"))
):
    from app.services.custody_service import custody_service
    result = custody_service.verify_chain(db, evidence_id)
    if result.get("valid") is False and "message" in result and "not found" in result["message"]:
        raise HTTPException(status_code=404, detail=result["message"])

    return result

@router.post("/{evidence_id}/grant-access/", status_code=200)
def grant_evidence_access(
    evidence_id: str,
    payload: GrantAccessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Grants access to evidence by verifying an on-chain multisig request.
    """
    import uuid
    from app.services.custody_service import custody_service

    # 1. Fetch evidence record
    evidence = db.query(Evidence).filter(Evidence.id == uuid.UUID(evidence_id)).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    # 2. Convert identifiers to hex for blockchain service
    # case_id is stored as UUID, evidence_id as UUID
    case_id_hex = evidence.case_id.hex if evidence.case_id else ""
    evidence_id_hex = evidence.id.hex
    # Convert action string to bytes32 (keccak256)
    action_hex = Web3.keccak(text=payload.action).hex() if 'Web3' in globals() else ""
    # Wait, I can't use Web3 here directly without importing it.

    # I'll import Web3 at the top or inside.
    # Better to use blockchain_service to handle the conversion.

    # Let's refine the blockchain_service.verify_access_request call.
    # It expects hex strings.

    is_verified = blockchain_service.verify_access_request(
        request_id=payload.request_id,
        expected_case_id=case_id_hex,
        expected_evidence_id=evidence_id_hex,
        expected_action=payload.action # Pass raw string, service handles it
    )

    if not is_verified:
        raise HTTPException(status_code=403, detail="Blockchain authorization failed or threshold not met")

    # 3. Record access grant in DB
    access_grant = EvidenceAccess(
        evidence_id=evidence.id,
        user_id=current_user.id,
        action=payload.action,
        request_id=payload.request_id
    )
    db.add(access_grant)

    # 4. Log in custody chain
    custody_service.create_event(
        db,
        evidence=evidence,
        case_id=evidence.case_id,
        event_type="ACCESS_GRANTED",
        actor=current_user.username,
        description=f"Access granted via multisig request {payload.request_id} for action {payload.action}"
    )

    db.commit()
    return {"detail": "Access granted successfully"}
