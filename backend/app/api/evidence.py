from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.db.database import get_db
from app.schemas.evidence import EvidenceResponse, EvidenceListResponse, VerificationResponse
from app.services import evidence_service
from app.core.config import settings
from app.db.models import Evidence

router = APIRouter(prefix="/api/evidence", tags=["evidence"])

@router.get("/stats/", response_model=None)
def get_evidence_stats(db: Session = Depends(get_db)):
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
    uploaded_by: str = Form(...),
    db: Session = Depends(get_db)
):
    if file.size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE / (1024*1024):.2f} MB")

    try:
        evidence = evidence_service.create_evidence(db, file, uploaded_by)
        return evidence
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/", response_model=EvidenceListResponse)
def get_evidence(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
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
def get_evidence_by_id(evidence_id: str, db: Session = Depends(get_db)):
    evidence = evidence_service.get_evidence_by_id(db, evidence_id)
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence record not found")
    return evidence

@router.post("/{evidence_id}/verify/", response_model=VerificationResponse)
async def verify_evidence(
    evidence_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    result = evidence_service.verify_evidence_integrity(db, evidence_id, file)
    if result is None:
        raise HTTPException(status_code=404, detail="Evidence record not found")
    return result
