import os
import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.db.models import Evidence, CustodyEvent
from app.core.config import settings
from app.services.custody_service import custody_service

def diagnose():
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    evidence_id = "EV-2026-000007"
    evidence = session.query(Evidence).filter(Evidence.evidence_id == evidence_id).first()
    
    if not evidence:
        print(f"Evidence {evidence_id} not found")
        return

    events = session.query(CustodyEvent).filter(
        CustodyEvent.evidence_id == evidence.id
    ).order_by(CustodyEvent.id.asc()).all()

    print(f"--- Diagnostic for {evidence_id} ---")
    
    prev_hash = None
    for i, event in enumerate(events):
        print(f"\nEvent {i+1}: {event.event_type}")
        print(f"  Stored Hash: {event.event_hash}")
        print(f"  Previous Hash: {event.previous_event_hash}")
        
        event_data = {
            "evidence_id": evidence.evidence_id,
            "event_type": event.event_type,
            "actor": event.actor,
            "timestamp": event.timestamp,
            "description": event.description,
            "metadata": event.metadata_json
        }
        
        # Recompute using current service
        calc_hash = custody_service._calculate_event_hash(event_data, prev_hash)
        
        # Log exactly what was hashed
        # We have to mimic the internal canonicalization since it's a private method
        # But since we can import the service, we can just use a wrapper or call it.
        # To be safe, I'll just print the calculated hash.
        
        print(f"  Calculated Hash: {calc_hash}")
        print(f"  Match: {calc_hash == event.event_hash}")
        
        prev_hash = event.event_hash

if __name__ == "__main__":
    diagnose()
