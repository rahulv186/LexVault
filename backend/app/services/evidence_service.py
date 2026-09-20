import os
import hashlib
import uuid
from typing import Generator, BinaryIO, Optional
from sqlalchemy.orm import Session
from app.db.models import Evidence, CustodyEvent
from app.services.encryption_service import encryption_service, FramingViolationError
from app.services.storage import storage_provider
from app.services.custody_service import custody_service
from app.core.config import settings
from datetime import datetime, timezone

def generate_secure_evidence_id() -> str:
    """Generates a collision-safe unique evidence ID."""
    return f"EV-{uuid.uuid4().hex[:12].upper()}"

def create_evidence_streaming(db: Session, upload_file, uploaded_by: str, case_id: Optional[uuid.UUID] = None) -> Evidence:
    """
    Implements a secure streaming pipeline for evidence upload:
    Plaintext Stream -> SHA-256 -> AES-GCM (Framed) -> Storage
    """
    # 1. Setup Encryption Keys
    dek = os.urandom(32)
    wrapped_dek = encryption_service.wrap_key(dek)
    base_nonce = os.urandom(12)

    original_filename = upload_file.filename
    mime_type = upload_file.content_type

    # Generate safe storage reference
    storage_ref = f"{uuid.uuid4().hex}.enc"

    sha256_hasher = hashlib.sha256()
    bytes_processed = 0
    chunk_idx = 0

    # Temporary buffer for storage save
    # In a real S3 implementation, we'd stream directly.
    # For LocalStorage, we use a temporary file then move it.
    import tempfile
    with tempfile.TemporaryFile() as tmp_storage:
        # A. Write Header
        # We don't know total_chunks yet, so we estimate or update later.
        # For the framing spec, we'll calculate it or use a sentinel.
        # Since we need total_chunks in the header, we'll process the stream once
        # or use a placeholder and seek back. LocalStorage allows seeking.

        # For simplicity in this streaming implementation, we'll use a 2-pass
        # if the file size is known, or a placeholder header.
        # Let's use a placeholder header and patch it at the end.

        header_placeholder = b"\x00" * (1 + 4 + 4 + 12 + 16)
        tmp_storage.write(header_placeholder)

        # B. Streaming Encryption Loop
        while chunk := upload_file.file.read(1024 * 1024):
            # Enforce Max Upload Size
            bytes_processed += len(chunk)
            if bytes_processed > settings.MAX_UPLOAD_SIZE:
                raise ValueError(f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE} bytes")

            # Calculate Hash
            sha256_hasher.update(chunk)

            # Encrypt Chunk
            ciphertext = encryption_service.encrypt_chunk(dek, chunk_idx, chunk, base_nonce)

            # Write: [Chunk Index (4B)][Ciphertext]
            tmp_storage.write(chunk_idx.to_bytes(4, 'big'))
            tmp_storage.write(ciphertext)

            chunk_idx += 1

        final_hash = sha256_hasher.digest()

        # C. Write Footer
        footer = encryption_service.create_footer(final_hash)
        tmp_storage.write(footer)

        # D. Patch Header
        tmp_storage.seek(0)
        header = encryption_service.create_header(chunk_idx, 1024 * 1024, base_nonce)
        tmp_storage.write(header)

        # E. Persist to Storage
        tmp_storage.seek(0)
        storage_provider.save(tmp_storage, storage_ref)

    # 2. Database Record
    encrypted_size = (1 + 4 + 4 + 12 + 16) + (chunk_idx * (4 + 1024 * 1024 + 16)) + (32 + 4 + 16)
    # Note: the above is a max; the last chunk might be smaller.
    # We can get the actual size from the storage provider or just use bytes_processed as approx.

    db_evidence = Evidence(
        evidence_id=generate_secure_evidence_id(),
        original_filename=original_filename,
        mime_type=mime_type,
        file_size=bytes_processed,
        sha256=final_hash.hex(),
        uploaded_by=uploaded_by,
        wrapped_dek=wrapped_dek,
        storage_provider="local",
        storage_ref=storage_ref,
        encryption_version=1,
        encrypted_file_size=encrypted_size,
        case_id=case_id
    )

    db.add(db_evidence)
    db.commit()
    db.refresh(db_evidence)

    # 3. Chain of Custody
    custody_service.create_event(
        db,
        event_type="UPLOADED",
        actor=uploaded_by,
        description=f"Plaintext stream received: {original_filename}",
        evidence=db_evidence
    )
    custody_service.create_event(
        db,
        event_type="HASHED",
        actor="System",
        description=f"SHA-256 computed: {db_evidence.sha256[:16]}...",
        evidence=db_evidence
    )
    custody_service.create_event(
        db,
        event_type="ENCRYPTED",
        actor="System",
        description="Per-file DEK generated and framing applied",
        evidence=db_evidence
    )
    custody_service.create_event(
        db,
        event_type="STORED",
        actor="System",
        description=f"Encrypted evidence persisted to {db_evidence.storage_provider} at {storage_ref}",
        evidence=db_evidence
    )

    return db_evidence

def download_evidence_streaming(db: Session, evidence_id: str) -> Generator[bytes, None, None]:
    """
    Authenticated decryption stream:
    Storage -> Decrypt -> Hash Verify -> Plaintext Stream
    """
    evidence = db.query(Evidence).filter(Evidence.evidence_id == evidence_id).first()
    if not evidence:
        raise ValueError("Evidence not found")

    # Recover DEK
    dek = encryption_service.unwrap_key(evidence.wrapped_dek)

    # Load storage stream
    stream = storage_provider.load(evidence.storage_ref)

    sha256_hasher = hashlib.sha256()

    try:
        # 1. Verify Header
        header_data = stream.read(1 + 4 + 4 + 12 + 16)
        total_chunks, chunk_size, base_nonce = encryption_service.verify_header(header_data)

        # 2. Decrypt Chunks
        for i in range(total_chunks):
            # Read Index
            idx_data = stream.read(4)
            if not idx_data or len(idx_data) < 4:
                raise FramingViolationError("Unexpected end of stream while reading chunk index.")

            idx = int.from_bytes(idx_data, 'big')
            if idx != i:
                raise FramingViolationError(f"Chunk reordering detected. Expected {i}, got {idx}")

            # Read Length
            len_data = stream.read(4)
            if not len_data or len(len_data) < 4:
                raise FramingViolationError(f"Unexpected end of stream while reading length for chunk {i}.")

            ciphertext_len = int.from_bytes(len_data, 'big')

            # Read Ciphertext
            ciphertext = stream.read(ciphertext_len)
            if not ciphertext or len(ciphertext) < ciphertext_len:
                raise FramingViolationError(f"Chunk {i} is truncated. Expected {ciphertext_len} bytes.")

            plaintext = encryption_service.decrypt_chunk(dek, i, ciphertext, base_nonce)
            sha256_hasher.update(plaintext)
            yield plaintext

        # 3. Verify Footer
        footer_data = stream.read(32 + 4 + 16)
        if not footer_data:
            raise FramingViolationError("Missing footer: File truncated.")

        # Integrity check against the hash in the footer and the DB
        encryption_service.verify_footer(footer_data, bytes.fromhex(evidence.sha256))

        # Final check against calculated hash
        if sha256_hasher.digest().hex() != evidence.sha256:
            raise FramingViolationError("Final plaintext hash mismatch. Evidence tampered with.")

    finally:
        stream.close()

def verify_evidence_integrity(db: Session, evidence_id: str, upload_file, uploaded_by: str) -> dict:
    """
    Verifies that a newly uploaded file matches the original stored evidence hash.
    This is used for external verification of evidence.
    """
    evidence = get_evidence_by_id(db, evidence_id)
    if not evidence:
        return None

    sha256_hasher = hashlib.sha256()
    try:
        # Read the uploaded file in chunks to compute hash
        while chunk := upload_file.file.read(1024 * 1024):
            sha256_hasher.update(chunk)

        calculated_hash = sha256_hasher.digest().hex()

        if calculated_hash == evidence.sha256:
            return {
                "verified": True,
                "status": "verified",
                "original_hash": evidence.sha256,
                "current_hash": calculated_hash,
                "message": "Uploaded file matches the stored evidence hash."
            }
        else:
            return {
                "verified": False,
                "status": "tampered",
                "original_hash": evidence.sha256,
                "current_hash": calculated_hash,
                "message": "Uploaded file does not match the stored evidence hash."
            }
    except Exception as e:
        return {
            "verified": False,
            "status": "error",
            "original_hash": evidence.sha256,
            "current_hash": "N/A",
            "message": f"Verification failed: {str(e)}"
        }

def verify_stored_evidence_integrity(db: Session, evidence_id: str) -> dict:
    """
    Full integrity check of the stored encrypted file.
    Decrypts and verifies SHA-256.
    """
    evidence = db.query(Evidence).filter(Evidence.evidence_id == evidence_id).first()
    if not evidence:
        return {"verified": False, "message": "Evidence not found"}

    try:
        # We use the download stream logic to verify
        hasher = hashlib.sha256()
        for chunk in download_evidence_streaming(db, evidence_id):
            hasher.update(chunk)

        return {
            "verified": True,
            "status": "verified",
            "message": "Stored evidence integrity verified successfully."
        }
    except Exception as e:
        return {
            "verified": False,
            "status": "tampered",
            "message": str(e)
        }

def get_evidence_list(db: Session, page: int = 1, page_size: int = 20, status: str = None, search: str = None, evidence_type: str = None):
    query = db.query(Evidence)
    if status:
        query = query.filter(Evidence.verification_status == status)
    if evidence_type:
        query = query.filter((Evidence.mime_type.ilike(f"%{evidence_type}%")) | (Evidence.original_filename.ilike(f"%{evidence_type}%")))
    if search:
        search_filter = f"%{search}%"
        query = query.filter((Evidence.evidence_id.ilike(search_filter)) | (Evidence.original_filename.ilike(search_filter)) | (Evidence.uploaded_by.ilike(search_filter)))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return total, items

def get_evidence_by_id(db: Session, evidence_id: str):
    return db.query(Evidence).filter(Evidence.evidence_id == evidence_id).first()
