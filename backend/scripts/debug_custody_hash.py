import os
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import Evidence, CustodyEvent
from app.services.custody_hash import calculate_custody_hash, normalize_timestamp, normalize_metadata
from app.core.config import settings
import json

def debug_event(evidence_id, event_id):
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    evidence = session.query(Evidence).filter(Evidence.evidence_id == evidence_id).first()
    event = session.query(CustodyEvent).filter(CustodyEvent.id == event_id).first()

    if not evidence or not event:
        print("Evidence or Event not found")
        return

    print(f"--- Debugging Event {event_id} ({event.event_type}) ---")
    print(f"Stored event_hash: {event.event_hash}")
    
    # Reconstruction
    ts_norm = normalize_timestamp(event.timestamp)
    meta_norm = normalize_metadata(event.metadata_json)
    
    print(f"DB Timestamp: {event.timestamp}")
    print(f"Normalized Timestamp: {ts_norm}")
    print(f"Normalized Metadata: {json.dumps(meta_norm, sort_keys=True)}")
    
    calc_hash = calculate_custody_hash(
        evidence_id=evidence.evidence_id,
        event_type=event.event_type,
        actor=event.actor,
        timestamp=event.timestamp,
        description=event.description,
        metadata=event.metadata_json,
        previous_event_hash=event.previous_event_hash
    )
    
    print(f"Calculated Hash: {calc_hash}")
    print(f"Match: {calc_hash == event.event_hash}")

if __name__ == "__main__":
    # The user mentioned EV-2026-000007 event id 5
    debug_event("EV-2026-000007", 5)
