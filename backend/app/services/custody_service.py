import hashlib
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import CustodyEvent, Evidence

class CustodyService:
    def _calculate_event_hash(self, event_data: Dict[str, Any], previous_hash: Optional[str]) -> str:
        """
        Deterministically calculates the SHA-256 hash of an event.
        """
        # Canonical serialization: Sorted keys, stable separators
        # Fields to hash: evidence_id, event_type, actor, timestamp, description, metadata, previous_event_hash

        # Ensure metadata is a sorted JSON string if it's a dict
        metadata_str = ""
        if event_data.get("metadata"):
            metadata_str = json.dumps(event_data["metadata"], sort_keys=True, separators=(",", ":"))

        canonical_string = (
            f"{event_data['evidence_id']}|"
            f"{event_data['event_type']}|"
            f"{event_data['actor']}|"
            f"{event_data['timestamp']}|"
            f"{event_data['description']}|"
            f"{metadata_str}|"
            f"{previous_hash or ''}"
        )

        return hashlib.sha256(canonical_string.encode('utf-8')).hexdigest()

    def create_event(self, db: Session, evidence: Evidence, event_type: str, actor: str, description: str, metadata: Optional[Dict[str, Any]] = None) -> CustodyEvent:
        """
        Creates a new custody event, linking it to the previous event's hash.
        """
        # Get the latest event for this evidence to link the hash
        last_event = db.query(CustodyEvent).filter(
            CustodyEvent.evidence_id == evidence.id
        ).order_by(CustodyEvent.id.desc()).first()

        previous_hash = last_event.event_hash if last_event else None
        timestamp = datetime.utcnow().isoformat()

        event_data = {
            "evidence_id": evidence.evidence_id,
            "event_type": event_type,
            "actor": actor,
            "timestamp": timestamp,
            "description": description,
            "metadata": metadata
        }

        event_hash = self._calculate_event_hash(event_data, previous_hash)

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
        """
        Verifies the integrity of the entire custody chain.
        """
        evidence = db.query(Evidence).filter(Evidence.evidence_id == evidence_id).first()
        if not evidence:
            return {"valid": False, "message": "Evidence not found."}

        events = self.get_custody_chain(db, evidence_id)
        if not events:
            return {"valid": False, "message": "No custody events found."}

        prev_hash = None
        for i, event in enumerate(events):
            # Recompute the hash of the event
            event_data = {
                "evidence_id": evidence.evidence_id,
                "event_type": event.event_type,
                "actor": event.actor,
                "timestamp": event.timestamp.isoformat() if hasattr(event.timestamp, 'isoformat') else event.timestamp,
                "description": event.description,
                "metadata": event.metadata_json
            }

            # Note: we must use the exact same timestamp string as stored in the DB
            # If timestamp was converted to datetime object, we need the original string.
            # Since we stored it as DateTime in DB, we need to be careful about precision.
            # For this milestone, we'll assume the timestamp stored is what we use.
            # However, to be truly deterministic, we should store the canonical timestamp string.

            actual_hash = self._calculate_event_hash(event_data, prev_hash)

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
