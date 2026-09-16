import json
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db.models import Evidence, ZKProof


PROJECT_ROOT = Path(__file__).resolve().parents[3]
ZK_ROOT = PROJECT_ROOT / "zk"


class ZKServiceError(Exception):
    pass


class ZKService:
    def _run_zk_script(self, script_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        script_path = ZK_ROOT / "scripts" / script_name
        if not script_path.exists():
            raise ZKServiceError(f"ZK script not found: {script_name}")

        try:
            completed = subprocess.run(
                ["node", str(script_path)],
                input=json.dumps(payload),
                text=True,
                capture_output=True,
                cwd=str(PROJECT_ROOT),
                timeout=60,
                check=True,
            )
        except subprocess.CalledProcessError as exc:
            raise ZKServiceError("ZK script execution failed.") from exc
        except subprocess.TimeoutExpired as exc:
            raise ZKServiceError("ZK script execution timed out.") from exc

        try:
            return json.loads(completed.stdout)
        except json.JSONDecodeError as exc:
            raise ZKServiceError("ZK script returned invalid JSON.") from exc

    def generate_proof(self, db: Session, evidence_public_id: str) -> Optional[ZKProof]:
        evidence = db.query(Evidence).filter(Evidence.evidence_id == evidence_public_id).first()
        if not evidence:
            return None

        proof_payload = self._run_zk_script(
            "prove.js",
            {
                "evidence_id": evidence.evidence_id,
                "sha256": evidence.sha256,
            },
        )

        zk_proof = ZKProof(
            proof_id=f"ZKP-{uuid.uuid4().hex[:12].upper()}",
            evidence_id=evidence.id,
            circuit_name=proof_payload["circuit_name"],
            circuit_version=proof_payload["circuit_version"],
            proving_system=proof_payload["proving_system"],
            public_inputs=proof_payload["public_inputs"],
            public_signals=proof_payload["public_signals"],
            proof_data=proof_payload["proof"],
            status="GENERATED",
            verification_result=None,
        )

        db.add(zk_proof)
        db.commit()
        db.refresh(zk_proof)
        return zk_proof

    def list_proofs(self, db: Session) -> list[ZKProof]:
        return db.query(ZKProof).order_by(ZKProof.created_at.desc()).all()

    def get_proof(self, db: Session, proof_id: str) -> Optional[ZKProof]:
        return db.query(ZKProof).filter(ZKProof.proof_id == proof_id).first()

    def verify_proof(
        self,
        db: Session,
        proof_id: str,
        proof_override: Optional[dict[str, Any]] = None,
        public_signals_override: Optional[list[Any]] = None,
        persist_result: bool = True,
    ) -> Optional[dict[str, Any]]:
        zk_proof = self.get_proof(db, proof_id)
        if not zk_proof:
            return None

        proof = proof_override if proof_override is not None else zk_proof.proof_data
        public_signals = public_signals_override if public_signals_override is not None else zk_proof.public_signals

        verify_payload = self._run_zk_script(
            "verify.js",
            {
                "proof": proof,
                "public_signals": public_signals,
            },
        )

        valid = bool(verify_payload.get("valid"))
        verified_at = datetime.now(timezone.utc)

        if persist_result and proof_override is None and public_signals_override is None:
            zk_proof.verification_result = valid
            zk_proof.status = "VERIFIED" if valid else "INVALID"
            zk_proof.verified_at = verified_at
            db.commit()
            db.refresh(zk_proof)

        return {
            "proof_id": zk_proof.proof_id,
            "valid": valid,
            "status": "VERIFIED" if valid else "INVALID",
            "verified_at": verified_at,
        }


zk_service = ZKService()
