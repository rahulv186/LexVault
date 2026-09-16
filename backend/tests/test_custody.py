import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.database import Base
from app.db.models import Evidence, CustodyEvent
from app.services.custody_service import custody_service

@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_custody_chain_creation_and_verification(db_session):
    # 1. Create an evidence record
    evidence = Evidence(
        evidence_id="TEST-EV-001",
        original_filename="test.txt",
        stored_filename="test.enc",
        mime_type="text/plain",
        file_size=100,
        sha256="fake-hash",
        uploaded_by="TestUser",
        verification_status="pending"
    )
    db_session.add(evidence)
    db_session.commit()
    db_session.refresh(evidence)

    # 2. Create a chain of events
    custody_service.create_event(db_session, evidence, "EVENT_1", "UserA", "Created")
    custody_service.create_event(db_session, evidence, "EVENT_2", "UserB", "Uploaded")
    custody_service.create_event(db_session, evidence, "EVENT_3", "UserC", "Verified")

    # 3. Verify the chain
    result = custody_service.verify_chain(db_session, "TEST-EV-001")
    assert result["valid"] is True
    assert result["events_checked"] == 3

def test_custody_tampering(db_session):
    evidence = Evidence(
        evidence_id="TEST-EV-002",
        original_filename="test.txt",
        stored_filename="test.enc",
        mime_type="text/plain",
        file_size=100,
        sha256="fake-hash",
        uploaded_by="TestUser",
        verification_status="pending"
    )
    db_session.add(evidence)
    db_session.commit()
    db_session.refresh(evidence)

    custody_service.create_event(db_session, evidence, "EVENT_1", "UserA", "Created")
    custody_service.create_event(db_session, evidence, "EVENT_2", "UserB", "Uploaded")

    # Tamper with the first event's description
    event = db_session.query(CustodyEvent).filter(CustodyEvent.evidence_id == evidence.id).first()
    event.description = "TAMPERED DESCRIPTION"
    db_session.commit()

    result = custody_service.verify_chain(db_session, "TEST-EV-002")
    assert result["valid"] is False
    assert "Hash mismatch" in result["message"]
