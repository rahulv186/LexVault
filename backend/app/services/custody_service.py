import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import CustodyEvent, Evidence

from app.db.models import CustodyEvent, Evidence
from app.services.custody_hash import calculate_custody_hash

class CustodyService:
    def create_event(self, db: Session, evidence: Evidence, event_type: str, actor: str, description: str, metadata: Optional[Dict[str, Any]] = None) -> CustodyEvent:
        """Creates a new custody event, linking it to the previous event's hash."""
        last_event = db.query(CustodyEvent).filter(
            CustodyEvent.evidence_id == evidence.id
        ).order_by(CustodyEvent.id.desc()).first()

        previous_hash = last_event.event_hash if last_event else None

        # Use timezone-aware UTC datetime object
        timestamp = datetime.now(timezone.utc)

        event_hash = calculate_custody_hash(
            evidence_id=evidence.evidence_id,
            event_type=event_type,
            actor=actor,
            timestamp=timestamp,
            description=description,
            metadata=metadata,
            previous_event_hash=previous_hash
        )

        new_event = CustodyEvent(
            evidence_id=evidence.id,
            event_type=event_type,
            actor=actor,
            timestamp=timestamp,
            description=description,
            metadata_json=metadata,
            previous_event_hash=previous_hash,
            event_hash=event_hash
        )

        db.add(new_event)
        db.commit()
        db.refresh(new_event)
        return new_event

    def get_custody_chain(self, db: Session, evidence_id: str) -> List[CustodyEvent]:
        """Retrieves the chronological chain of custody for a specific evidence item."""
        evidence = db.query(Evidence).filter(Evidence.evidence_id == evidence_id).first()
        if not evidence:
            return []

        return db.query(CustodyEvent).filter(
            CustodyEvent.evidence_id == evidence.id
        ).order_by(CustodyEvent.id.asc()).all()

    def verify_chain(self, db: Session, evidence_id: str) -> Dict[str, Any]:
        """Verifies the integrity of the entire custody chain."""
        evidence = db.query(Evidence).filter(Evidence.evidence_id == evidence_id).first()
        if not evidence:
            return {"valid": False, "message": "Evidence not found."}

        events = self.get_custody_chain(db, evidence_id)
        if not events:
            return {"valid": False, "message": "No custody events found."}

        prev_hash = None
        for i, event in enumerate(events):
            actual_hash = calculate_custody_hash(
                evidence_id=evidence.evidence_id,
                event_type=event.event_type,
                actor=event.actor,
                timestamp=event.timestamp,
                description=event.description,
                metadata=event.metadata_json,
                previous_event_hash=prev_hash
            )

            if actual_hash != event.event_hash:
                return {
                    "valid": False,
                    "message": f"Hash mismatch at event {i+1}: {event.event_type}",
                    "events_checked": i + 1
                }

            if event.previous_event_hash != prev_hash:
                return {
                    "valid": False,
                    "message": f"Chain break at event {i+1}: Previous hash mismatch",
                    "events_checked": i + 1
                }

            prev_hash = event.event_hash

        return {
            "valid": True,
            "evidence_id": evidence.evidence_id,
            "message": "Custody chain verified successfully.",
            "events_checked": len(events)
        }

custody_service = CustodyService()
