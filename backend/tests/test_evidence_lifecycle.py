import pytest
import os
import uuid
import hashlib
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.db.models import Evidence, User, Role, Permission, RolePermission
from app.services.evidence_service import create_evidence_streaming, download_evidence_streaming, verify_stored_evidence_integrity
from app.services.encryption_service import encryption_service, FramingViolationError
from app.services.storage import storage_provider
from app.core.config import settings

# Test DB Setup - Use a file-based SQLite DB to allow shared state across connections
TEST_DATABASE_URL = "sqlite:///lexvault_test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # Seed Roles and Permissions
    with SessionLocal() as db:
        admin_role = Role(name="admin", description="Administrator")
        user_role = Role(name="user", description="Standard User")
        db.add_all([admin_role, user_role])
        db.commit()

        p1 = Permission(name="evidence:create")
        p2 = Permission(name="evidence:read")
        p3 = Permission(name="evidence:verify")
        db.add_all([p1, p2, p3])
        db.commit()

        db.add(RolePermission(role_id=admin_role.id, permission_id=p1.id))
        db.add(RolePermission(role_id=admin_role.id, permission_id=p2.id))
        db.add(RolePermission(role_id=admin_role.id, permission_id=p3.id))
        db.add(RolePermission(role_id=user_role.id, permission_id=p2.id))
        db.commit()

        admin_user = User(
            username="admin",
            email="admin@lexvault.test",
            password_hash="hashed",
            role_id=admin_role.id,
            is_active=True
        )
        db.add(admin_user)
        db.commit()

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

class MockUploadFile:
    def __init__(self, filename, content, content_type="application/octet-stream"):
        self.filename = filename
        self.content = content
        self.content_type = content_type
        self.size = len(content)
        self._pos = 0

    def read(self, size=-1):
        if self._pos >= len(self.content):
            return b""
        end = self._pos + size if size != -1 else len(self.content)
        data = self.content[self._pos:end]
        self._pos += len(data)
        return data

    @property
    def file(self):
        return self

def test_normal_upload_download(db):
    content = b"Hello LexVault! This is a test evidence file."
    file = MockUploadFile("test.txt", content)

    evidence = create_evidence_streaming(db, file, "admin")
    assert evidence.sha256 == hashlib.sha256(content).hexdigest()

    # Download and verify
    downloaded_content = b"".join(list(download_evidence_streaming(db, evidence.evidence_id)))
    assert downloaded_content == content

def test_large_chunked_file(db):
    # Create a file larger than CHUNK_SIZE (1MB)
    content = os.urandom(int(2.5 * 1024 * 1024))
    file = MockUploadFile("large.bin", content)

    evidence = create_evidence_streaming(db, file, "admin")
    downloaded_content = b"".join(list(download_evidence_streaming(db, evidence.evidence_id)))
    assert downloaded_content == content

def test_corrupted_ciphertext(db):
    content = b"Sensitive evidence data"
    file = MockUploadFile("secret.txt", content)
    evidence = create_evidence_streaming(db, file, "admin")

    # Corrupt the ciphertext in storage
    storage_ref = evidence.storage_ref
    path = Path(settings.UPLOADS_DIR) / storage_ref
    with open(path, "r+b") as f:
        f.seek(30) # Move past header
        byte = f.read(1)
        f.seek(30)
        f.write(bytes([ord(byte) ^ 0xFF])) # Flip bits

    with pytest.raises(FramingViolationError):
        list(download_evidence_streaming(db, evidence.evidence_id))

def test_truncated_ciphertext(db):
    content = b"Long evidence data that will be truncated"
    file = MockUploadFile("truncate.txt", content)
    evidence = create_evidence_streaming(db, file, "admin")

    # Truncate the file
    storage_ref = evidence.storage_ref
    path = Path(settings.UPLOADS_DIR) / storage_ref
    with open(path, "rb") as f:
        data = f.read()
    with open(path, "wb") as f:
        f.write(data[:len(data)//2]) # Cut in half

    with pytest.raises(FramingViolationError):
        list(download_evidence_streaming(db, evidence.evidence_id))

def test_wrong_auth_tag(db):
    content = b"Authenticated data"
    file = MockUploadFile("auth.txt", content)
    evidence = create_evidence_streaming(db, file, "admin")

    # Modify the tag of a chunk
    storage_ref = evidence.storage_ref
    path = Path(settings.UPLOADS_DIR) / storage_ref
    with open(path, "r+b") as f:
        f.seek(21 + 4 + 1) # Header + 1st chunk index + 1 byte into ciphertext
        f.write(b"X")

    with pytest.raises(FramingViolationError):
        list(download_evidence_streaming(db, evidence.evidence_id))

def test_sha256_mismatch(db):
    # This is harder to trigger since we control the footer.
    # We'll manually modify the footer's expected hash.
    content = b"Consistency test"
    file = MockUploadFile("consistency.txt", content)
    evidence = create_evidence_streaming(db, file, "admin")

    storage_ref = evidence.storage_ref
    path = Path(settings.UPLOADS_DIR) / storage_ref
    with open(path, "r+b") as f:
        f.seek(-32, os.SEEK_END) # Go to the hash in the footer
        f.write(os.urandom(32))

    with pytest.raises(FramingViolationError):
        list(download_evidence_streaming(db, evidence.evidence_id))

def test_concurrent_id_generation(db):
    import concurrent.futures

    def upload():
        # We need a separate session per thread
        with SessionLocal() as session:
            file = MockUploadFile("concurrent.txt", b"data")
            return create_evidence_streaming(session, file, "admin").evidence_id

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(upload) for _ in range(10)]
        ids = [f.result() for f in futures]

    assert len(set(ids)) == 10

def test_failed_upload_cleanup(db):
    # Create a file that exceeds MAX_UPLOAD_SIZE
    content = os.urandom(settings.MAX_UPLOAD_SIZE + 1024)
    file = MockUploadFile("too_large.bin", content)

    with pytest.raises(ValueError, match="exceeds maximum allowed size"):
        create_evidence_streaming(db, file, "admin")

    # Verify no evidence record was created
    assert db.query(Evidence).filter(Evidence.original_filename == "too_large.bin").first() is None
