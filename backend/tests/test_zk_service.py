from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.db.models import Evidence
from app.services.zk_service import zk_service


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def create_evidence(db_session):
    evidence = Evidence(
        evidence_id="EV-ZK-001",
        original_filename="zk.txt",
        stored_filename="zk.enc",
        mime_type="text/plain",
        file_size=11,
        sha256="b94d27b9934d3e08a52e52d7da7dabfadeb8807533481153a672857f8c7f6a0a",
        uploaded_by="investigator",
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


def test_valid_witness_generates_and_verifies_real_proof(db_session):
    create_evidence(db_session)

    proof = zk_service.generate_proof(db_session, "EV-ZK-001")
    result = zk_service.verify_proof(db_session, proof.proof_id)

    assert proof.evidence.evidence_id == "EV-ZK-001"
    assert proof.circuit_name == "evidence_commitment"
    assert proof.proving_system == "groth16"
    assert result["valid"] is True
    assert db_session.get(type(proof), proof.id).status == "VERIFIED"


def test_modified_public_signal_verification_fails(db_session):
    create_evidence(db_session)
    proof = zk_service.generate_proof(db_session, "EV-ZK-001")

    bad_signals = list(proof.public_signals)
    bad_signals[0] = "1"
    result = zk_service.verify_proof(
        db_session,
        proof.proof_id,
        public_signals_override=bad_signals,
    )

    assert result["valid"] is False


def test_modified_proof_verification_fails(db_session):
    create_evidence(db_session)
    proof = zk_service.generate_proof(db_session, "EV-ZK-001")

    bad_proof = dict(proof.proof_data)
    bad_proof["pi_a"] = list(bad_proof["pi_a"])
    bad_proof["pi_a"][0] = "1"
    result = zk_service.verify_proof(
        db_session,
        proof.proof_id,
        proof_override=bad_proof,
    )

    assert result["valid"] is False


def test_missing_proof_returns_none(db_session):
    assert zk_service.verify_proof(db_session, "ZKP-MISSING") is None


def test_private_witness_and_keys_are_not_persisted(db_session):
    create_evidence(db_session)
    proof = zk_service.generate_proof(db_session, "EV-ZK-001")

    persisted = db_session.get(type(proof), proof.id)
    persisted_json = str({
        "public_inputs": persisted.public_inputs,
        "public_signals": persisted.public_signals,
        "proof_data": persisted.proof_data,
    })

    assert "evidenceHash" not in persisted_json
    assert "blinding" not in persisted_json
    assert "LEXVAULT_ENCRYPTION_KEY" not in persisted_json
    assert "encryption_key" not in persisted_json
