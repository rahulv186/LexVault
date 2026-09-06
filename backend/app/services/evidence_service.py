from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Evidence
from app.schemas.evidence import EvidenceResponse
from app.services.hashing_service import calculate_sha256
from app.services.encryption_service import encryption_service
from app.utils.file_utils import save_upload_file
import datetime
import os
import tempfile
from pathlib import Path

def generate_evidence_id(db: Session) -> str:
    """Generates a unique evidence ID in the format EV-YYYY-XXXXXX."""
    year = datetime.datetime.now().year
    result = db.execute(
        func.count(Evidence.id)
    ).scalar()

    count = result or 0
    return f"EV-{year}-{str(count + 1).zfill(6)}"

def create_evidence(db: Session, upload_file, uploaded_by: str) -> Evidence:
    """Processes the upload, calculates hash, encrypts, and stores metadata."""
    original_filename = upload_file.filename

    # Use a temporary directory for plaintext processing to ensure cleanup
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir) / original_filename

        # 1. Save plaintext temporarily
        with open(tmp_path, "wb") as f:
            chunk_size = 1024 * 1024
            while chunk := upload_file.file.read(chunk_size):
                f.write(chunk)

        # 2. Calculate SHA-256 of original plaintext
        sha256 = calculate_sha256(str(tmp_path))

        # 3. Encrypt plaintext to final storage location
        stored_filename = f"{os.urandom(16).hex()}.enc"
        upload_dir = Path("uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
        stored_path = upload_dir / stored_filename

        try:
            base_nonce_hex, encrypted_size = encryption_service.encrypt_file(
                str(tmp_path), str(stored_path)
            )
        except Exception as e:
            if stored_path.exists():
                stored_path.unlink()
            raise e

        # 4. Generate Evidence ID
        evidence_id = generate_evidence_id(db)

        # 5. Create DB record with encryption metadata
        db_evidence = Evidence(
            evidence_id=evidence_id,
            original_filename=original_filename,
            stored_filename=stored_filename,
            mime_type=upload_file.content_type,
            file_size=upload_file.size,
            sha256=sha256,
            uploaded_by=uploaded_by,
            verification_status="pending",
            encryption_algorithm=encryption_service.algorithm,
            encryption_nonce=base_nonce_hex,
            encrypted_file_size=encrypted_size
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
    """
    Verifies a provided file upload against the stored SHA-256 hash.
    The uploaded file is assumed to be plaintext.
    """
    evidence = get_evidence_by_id(db, evidence_id)
    if not evidence:
        return None

    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        chunk_size = 1024 * 1024
        while chunk := verification_file.file.read(chunk_size):
            tmp.write(chunk)
        tmp_path = tmp.name

    try:
        current_hash = calculate_sha256(tmp_path)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    is_verified = current_hash == evidence.sha256

    return {
        "verified": is_verified,
        "status": "verified" if is_verified else "tampered",
        "original_hash": evidence.sha256,
        "current_hash": current_hash,
        "message": "Evidence integrity verified successfully." if is_verified else "Evidence integrity verification failed. Hash mismatch detected."
    }

def verify_stored_evidence_integrity(db: Session, evidence_id: str) -> dict:
    """
    Decrypts the stored encrypted file and verifies its SHA-256 hash.
    This verifies that the encrypted storage itself has not been tampered with.
    """
    evidence = get_evidence_by_id(db, evidence_id)
    if not evidence:
        return None

    stored_path = Path("backend/uploads") / evidence.stored_filename

    with tempfile.TemporaryDirectory() as tmp_dir:
        decrypted_path = Path(tmp_dir) / "decrypted.bin"
        try:
            encryption_service.decrypt_file(
                str(stored_path), str(decrypted_path), evidence.encryption_nonce
            )
            current_hash = calculate_sha256(str(decrypted_path))
            is_verified = current_hash == evidence.sha256
        except Exception as e:
            return {
                "verified": False,
                "status": "tampered",
                "message": f"Decryption failed: {str(e)}"
            }

    return {
        "verified": is_verified,
        "status": "verified" if is_verified else "tampered",
        "original_hash": evidence.sha256,
        "current_hash": current_hash,
        "message": "Stored evidence integrity verified." if is_verified else "Stored evidence hash mismatch."
    }
