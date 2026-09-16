from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.core.security import create_access_token, hash_password
from app.db.database import Base, get_db
from app.db.models import Evidence, Permission, Role, RolePermission, User
from app.main import app


ROLE_PERMISSIONS = {
    "ADMIN": [
        "evidence:create",
        "evidence:read",
        "evidence:verify",
        "evidence:custody:read",
        "evidence:custody:verify",
        "evidence:delete",
        "zk:generate",
        "zk:verify",
        "users:read",
        "users:manage",
    ],
    "INVESTIGATOR": [
        "evidence:create",
        "evidence:read",
        "evidence:verify",
        "evidence:custody:read",
        "evidence:custody:verify",
        "zk:generate",
        "zk:verify",
    ],
    "FORENSIC_ANALYST": [
        "evidence:read",
        "evidence:verify",
        "evidence:custody:read",
        "evidence:custody:verify",
        "zk:generate",
        "zk:verify",
    ],
    "AUDITOR": [
        "evidence:read",
        "evidence:verify",
        "evidence:custody:read",
        "evidence:custody:verify",
        "zk:verify",
    ],
    "VIEWER": [
        "evidence:read",
        "evidence:custody:read",
    ],
}


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    permissions = {}
    for permission_name in sorted({item for items in ROLE_PERMISSIONS.values() for item in items}):
        permission = Permission(name=permission_name, description=permission_name)
        session.add(permission)
        permissions[permission_name] = permission
    session.commit()

    for role_name, permission_names in ROLE_PERMISSIONS.items():
        role = Role(name=role_name, description=f"Role for {role_name}")
        session.add(role)
        session.commit()
        session.refresh(role)
        for permission_name in permission_names:
            session.add(RolePermission(role_id=role.id, permission_id=permissions[permission_name].id))
    session.commit()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def create_user(db_session, username, role_name, is_active=True):
    role = db_session.query(Role).filter(Role.name == role_name).one()
    user = User(
        username=username,
        email=f"{username}@example.test",
        password_hash=hash_password("Password123"),
        full_name=username.title(),
        role_id=role.id,
        is_active=is_active,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def auth_headers(user):
    token = create_access_token({"sub": str(user.id)}, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


def create_evidence(db_session, evidence_id="EV-TEST-001", uploaded_by="investigator"):
    evidence = Evidence(
        evidence_id=evidence_id,
        original_filename="sample.txt",
        stored_filename="sample.enc",
        mime_type="text/plain",
        file_size=11,
        sha256="b94d27b9934d3e08a52e52d7da7dabfadeb8807533481153a672857f8c7f6a0a",
        uploaded_by=uploaded_by,
        uploaded_at=datetime.now(timezone.utc),
        verification_status="pending",
        encryption_algorithm="AES-256-GCM",
        encrypted_file_size=27,
        ipfs_status="failed",
    )
    db_session.add(evidence)
    db_session.commit()
    db_session.refresh(evidence)
    return evidence


def test_unauthenticated_request_is_rejected(client):
    response = client.get("/api/evidence/")
    assert response.status_code == 401


def test_viewer_read_allowed_but_privileged_actions_rejected(client, db_session):
    viewer = create_user(db_session, "viewer", "VIEWER")
    create_evidence(db_session)

    read_response = client.get("/api/evidence/", headers=auth_headers(viewer))
    assert read_response.status_code == 200

    upload_response = client.post(
        "/api/evidence/upload/",
        headers=auth_headers(viewer),
        files={"file": ("sample.txt", b"hello world", "text/plain")},
    )
    assert upload_response.status_code == 403

    verify_response = client.post(
        "/api/evidence/EV-TEST-001/verify/",
        headers=auth_headers(viewer),
        files={"file": ("sample.txt", b"hello world", "text/plain")},
    )
    assert verify_response.status_code == 403

    users_response = client.get("/api/users/", headers=auth_headers(viewer))
    assert users_response.status_code == 403


def test_investigator_upload_allowed_and_uploaded_by_comes_from_token(client, db_session, monkeypatch):
    investigator = create_user(db_session, "investigator", "INVESTIGATOR")
    captured = {}

    def fake_create_evidence(db, upload_file, uploaded_by):
        captured["uploaded_by"] = uploaded_by
        return Evidence(
            id=1,
            evidence_id="EV-UPLOAD-001",
            original_filename=upload_file.filename,
            stored_filename="stored.enc",
            mime_type="text/plain",
            file_size=11,
            sha256="abc123",
            uploaded_by=uploaded_by,
            uploaded_at=datetime.now(timezone.utc),
            verification_status="pending",
            encryption_algorithm="AES-256-GCM",
            encrypted_file_size=27,
            ipfs_status="failed",
        )

    monkeypatch.setattr("app.services.evidence_service.create_evidence", fake_create_evidence)

    response = client.post(
        "/api/evidence/upload/",
        headers=auth_headers(investigator),
        data={"uploaded_by": "ADMIN"},
        files={"file": ("sample.txt", b"hello world", "text/plain")},
    )

    assert response.status_code == 201
    assert captured["uploaded_by"] == "investigator"
    assert response.json()["uploaded_by"] == "investigator"


def test_auditor_can_verify_custody_chain(client, db_session):
    auditor = create_user(db_session, "auditor", "AUDITOR")
    evidence = create_evidence(db_session)
    from app.services.custody_service import custody_service

    custody_service.create_event(db_session, evidence, "CREATED", "investigator", "Created")

    response = client.post(
        "/api/evidence/EV-TEST-001/custody/verify/",
        headers=auth_headers(auditor),
    )

    assert response.status_code == 200
    assert response.json()["valid"] is True


def test_disabled_user_is_rejected_with_existing_token(client, db_session):
    viewer = create_user(db_session, "disabled_viewer", "VIEWER")
    headers = auth_headers(viewer)
    viewer.is_active = False
    db_session.commit()

    response = client.get("/api/evidence/", headers=headers)

    assert response.status_code == 403


def test_role_changes_take_effect_for_same_access_token(client, db_session, monkeypatch):
    user = create_user(db_session, "rolechange", "INVESTIGATOR")
    headers = auth_headers(user)
    create_evidence(db_session)

    monkeypatch.setattr(
        "app.services.evidence_service.create_evidence",
        lambda db, upload_file, uploaded_by: Evidence(
            id=2,
            evidence_id="EV-ROLE-001",
            original_filename=upload_file.filename,
            stored_filename="stored.enc",
            mime_type="text/plain",
            file_size=11,
            sha256="abc123",
            uploaded_by=uploaded_by,
            uploaded_at=datetime.now(timezone.utc),
            verification_status="pending",
            encryption_algorithm="AES-256-GCM",
            encrypted_file_size=27,
            ipfs_status="failed",
        ),
    )

    assert client.get("/api/evidence/", headers=headers).status_code == 200
    assert client.post(
        "/api/evidence/upload/",
        headers=headers,
        files={"file": ("sample.txt", b"hello world", "text/plain")},
    ).status_code == 201

    viewer_role = db_session.query(Role).filter(Role.name == "VIEWER").one()
    user.role_id = viewer_role.id
    db_session.commit()

    assert client.get("/api/evidence/", headers=headers).status_code == 200
    assert client.post(
        "/api/evidence/upload/",
        headers=headers,
        files={"file": ("sample.txt", b"hello world", "text/plain")},
    ).status_code == 403

    investigator_role = db_session.query(Role).filter(Role.name == "INVESTIGATOR").one()
    user.role_id = investigator_role.id
    db_session.commit()

    assert client.post(
        "/api/evidence/upload/",
        headers=headers,
        files={"file": ("sample.txt", b"hello world", "text/plain")},
    ).status_code == 201


def test_client_supplied_actor_is_ignored_for_verification_event(client, db_session):
    analyst = create_user(db_session, "analyst", "FORENSIC_ANALYST")
    evidence = create_evidence(db_session)

    response = client.post(
        f"/api/evidence/{evidence.evidence_id}/verify/",
        headers=auth_headers(analyst),
        data={"actor": "ADMIN"},
        files={"file": ("sample.txt", b"hello world", "text/plain")},
    )

    assert response.status_code == 200
    event = evidence.custody_events[-1]
    assert event.event_type == "VERIFICATION_PERFORMED"
    assert event.actor == "analyst"


def test_public_registration_cannot_create_admin(client, db_session):
    response = client.post(
        "/api/auth/register",
        json={
            "username": "registered",
            "email": "registered@example.com",
            "password": "Password123",
            "full_name": "Registered User",
            "role_name": "ADMIN",
        },
    )

    assert response.status_code == 201
    assert response.json()["role_name"] == "VIEWER"
    assert "users:manage" not in response.json()["permissions"]


def test_invalid_expired_and_malformed_jwts_are_rejected(client, db_session):
    create_evidence(db_session)

    invalid_response = client.get(
        "/api/evidence/",
        headers={"Authorization": "Bearer invalid.token.value"},
    )
    assert invalid_response.status_code == 401

    expired_token = create_access_token({"sub": "1"}, expires_delta=timedelta(minutes=-1))
    expired_response = client.get(
        "/api/evidence/",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert expired_response.status_code == 401

    malformed_subject = create_access_token({"sub": "not-an-int"}, expires_delta=timedelta(minutes=30))
    malformed_response = client.get(
        "/api/evidence/",
        headers={"Authorization": f"Bearer {malformed_subject}"},
    )
    assert malformed_response.status_code == 401


def test_zk_endpoints_require_auth_and_viewer_cannot_generate(client, db_session):
    viewer = create_user(db_session, "zk_viewer", "VIEWER")

    assert client.get("/api/zk/proofs/").status_code == 401
    response = client.post(
        "/api/zk/proofs/",
        headers=auth_headers(viewer),
        json={"evidence_id": "EV-TEST-001"},
    )

    assert response.status_code == 403


def test_zk_proof_associated_with_correct_evidence_id(client, db_session, monkeypatch):
    investigator = create_user(db_session, "zk_investigator", "INVESTIGATOR")
    evidence = create_evidence(db_session, evidence_id="EV-ZK-API-001")

    def fake_run_zk_script(script_name, payload):
        if script_name == "prove.js":
            return {
                "circuit_name": "evidence_commitment",
                "circuit_version": "1.0.0",
                "proving_system": "groth16",
                "public_inputs": {"commitment": "123"},
                "public_signals": ["123"],
                "proof": {"pi_a": ["1", "2", "1"], "protocol": "groth16", "curve": "bn128"},
            }
        return {"valid": True}

    monkeypatch.setattr("app.services.zk_service.zk_service._run_zk_script", fake_run_zk_script)

    response = client.post(
        "/api/zk/proofs/",
        headers=auth_headers(investigator),
        json={"evidence_id": evidence.evidence_id},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["evidence_public_id"] == "EV-ZK-API-001"
    assert body["circuit_name"] == "evidence_commitment"
    assert "evidenceHash" not in str(body)
    assert "blinding" not in str(body)
