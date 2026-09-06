import requests
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class IPFSService:
    def __init__(self):
        self.jwt = settings.PINATA_JWT
        self.base_url = "https://uploads.pinata.cloud/v3/files"

    def upload_file(self, file_path: str) -> Optional[str]:
        """
        Uploads an encrypted file to IPFS via Pinata V3 API.
        Returns the CID if successful, None otherwise.
        """
        if not self.jwt:
            logger.error("Pinata JWT is not configured.")
            return None

        # Safe diagnostics for JWT structure
        token = self.jwt.strip()
        sections = token.split('.')
        logger.info(f"JWT Diagnostics | Configured: True | Length: {len(token)} | Sections: {len(sections)} | Prefix: {token[:10]}...")

        if len(sections) != 3:
            logger.error("Pinata JWT is malformed. A valid JWT must have 3 dot-separated sections (Header.Payload.Signature). "
                         "The provided token has only one section. Please check your .env file.")
            return None

        path = Path(file_path)
        if not path.exists():
            logger.error(f"File not found for IPFS upload: {file_path}")
            return None

        headers = {
            "Authorization": f"Bearer {token}"
        }

        try:
            with open(path, "rb") as f:
                # V3 API expects 'file' and optional metadata
                files = {
                    "file": (path.name, f, "application/octet-stream")
                }

                # Metadata for the Pinata dashboard
                import json
                data = {
                    "name": path.name,
                    "network": "public",
                    "keyvalues": json.dumps({
                        "lexvault_encrypted_evidence": "true"
                    })
                }

                response = requests.post(
                    self.base_url,
                    headers=headers,
                    files=files,
                    data=data,
                    timeout=60
                )

                if response.status_code != 200:
                    logger.error(
                        f"Pinata V3 upload failed | Status: {response.status_code} | "
                        f"Endpoint: {self.base_url} | File: {path.name} | "
                        f"Response: {response.text}"
                    )
                    return None

                result = response.json()
                # Pinata V3 returns the CID nested inside a 'data' object
                data_payload = result.get("data", {})
                cid = data_payload.get("cid")

                if cid and isinstance(cid, str) and cid.strip():
                    logger.info(f"Successfully uploaded {path.name} to IPFS. CID: {cid}")
                    return cid
                else:
                    logger.error(f"Pinata V3 response did not contain a valid cid in 'data': {result}")
                    return None

        except requests.exceptions.RequestException as e:
            logger.error(f"IPFS upload network error for {path.name}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during IPFS upload for {path.name}: {str(e)}")
            return None

ipfs_service = IPFSService()
