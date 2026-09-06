from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Evidence
from app.schemas.evidence import EvidenceResponse
from app.services.hashing_service import calculate_sha256
from app.utils.file_utils import save_upload_file
import datetime

def generate_evidence_id(db: Session) -> str:
    """Generates a unique evidence ID in the format EV-YYYY-XXXXXX."""
    year = datetime.datetime.now().year
    # Find the highest current ID for the current year
    result = db.execute(
        # Simple count based approach for this milestone,
        # in prod we would use a sequence or a dedicated ID generator
        func.count(Evidence.id)
    ).scalar()

    count = result or 0
    return f"EV-{year}-{str(count + 1).zfill(6)}"

def create_evidence(db: Session, upload_file, uploaded_by: str) -> Evidence:
    """Processes the upload, calculates hash, and stores metadata."""
    original_filename = upload_file.filename

    # 1. Save file securely
    stored_path = save_upload_file(upload_file, original_filename)
    stored_filename = stored_path.split('/')[-1]

    # 2. Calculate SHA-256
    sha256 = calculate_sha256(stored_path)

    # 3. Generate Evidence ID
    evidence_id = generate_evidence_id(db)

    # 4. Create DB record
    db_evidence = Evidence(
        evidence_id=evidence_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        mime_type=upload_file.content_type,
        file_size=upload_file.size,
        sha256=sha256,
        uploaded_by=uploaded_by,
        verification_status="pending"
    )

    db.add(db_evidence)
    db.commit()
    db.refresh(db_evidence)
    return db_evidence

def get_evidence_list(db: Session, page: int = 1, page_size: int = 20, status: str = None, search: str = None, evidence_type: str = None):
    """Retrieves a paginated list of evidence records with optional filtering."""
    query = db.query(Evidence)

    if status:
        query = query.filter(Evidence.verification_status == status)

    if evidence_type:
        # For this milestone, we'll do a partial match on mime_type or original_filename
        query = query.filter(
            (Evidence.mime_type.ilike(f"%{evidence_type}%")) |
            (Evidence.original_filename.ilike(f"%{evidence_type}%"))
        )

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Evidence.evidence_id.ilike(search_filter)) |
            (Evidence.original_filename.ilike(search_filter)) |
            (Evidence.uploaded_by.ilike(search_filter))
        )

    total = query.count()
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return total, items

def get_evidence_by_id(db: Session, evidence_id: str):
    """Retrieves a single evidence record by its evidence_id."""
    return db.query(Evidence).filter(Evidence.evidence_id == evidence_id).first()

def verify_evidence_integrity(db: Session, evidence_id: str, verification_file) -> dict:
    """Verifies a provided file against the stored SHA-256 hash."""
    evidence = get_evidence_by_id(db, evidence_id)
    if not evidence:
        return None

    # Save verification file temporarily to calculate hash
    # Note: In a real system, we'd use a temp file or read directly from stream
    import tempfile
    import os

    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        chunk_size = 1024 * 1024
        while chunk := verification_file.file.read(chunk_size):
            tmp.write(chunk)
        tmp_path = tmp.name

    try:
        current_hash = calculate_sha256(tmp_path)
    finally:
        os.remove(tmp_path)

    is_verified = current_hash == evidence.sha256

    return {
        "verified": is_verified,
        "status": "verified" if is_verified else "tampered",
        "original_hash": evidence.sha256,
        "current_hash": current_hash,
        "message": "Evidence integrity verified." if is_verified else "Evidence integrity compromised. Hash mismatch detected."
    }
