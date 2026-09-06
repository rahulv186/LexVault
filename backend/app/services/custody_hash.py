import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any

def normalize_timestamp(ts: Any) -> str:
    """
    Normalizes a timestamp to a deterministic ISO-8601 string in UTC.
    Format: YYYY-MM-DDTHH:MM:SS.ffffffZ
    """
    if ts is None:
        return ""
    if isinstance(ts, str):
        try:
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        except ValueError:
            return ts
    elif isinstance(ts, datetime):
        dt = ts
    else:
        return str(ts)

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)

    return dt.strftime('%Y-%m-%dT%H:%M:%S.%f') + 'Z'

def normalize_metadata(metadata: Any) -> Any:
    """Recursively sorts dictionaries for deterministic serialization."""
    if isinstance(metadata, dict):
        return {k: normalize_metadata(v) for k, v in sorted(metadata.items())}
    if isinstance(metadata, list):
        return [normalize_metadata(i) for i in metadata]
    return metadata

def calculate_custody_hash(
    evidence_id: str,
    event_type: str,
    actor: str,
    timestamp: Any,
    description: str,
    metadata: Optional[Any] = None,
    previous_event_hash: Optional[str] = None
) -> str:
    """
    The single source of truth for custody event hashing.
    """
    payload = {
        "actor": actor,
        "description": description,
        "evidence_id": evidence_id,
        "event_type": event_type,
        "metadata": normalize_metadata(metadata),
        "previous_event_hash": previous_event_hash or "",
        "timestamp": normalize_timestamp(timestamp),
    }

    canonical_string = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False
    )

    return hashlib.sha256(canonical_string.encode("utf-8")).hexdigest()
