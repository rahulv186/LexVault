import os
import struct
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings
from pathlib import Path
from typing import Tuple, Optional, BinaryIO

# Binary Format Constants
FORMAT_VERSION = 1
CHUNK_SIZE = 1024 * 1024  # 1MB plaintext chunks
END_MARKER = b"\xDE\xAD\xBE\xEF"

class FramingViolationError(Exception):
    """Raised when the encrypted file framing is invalid or tampered with."""
    pass

class EncryptionService:
    def __init__(self):
        self.master_kek = settings.encryption_key
        self.algorithm = "AES-256-GCM"

    def wrap_key(self, dek: bytes) -> str:
        """Wraps a Data Encryption Key (DEK) using the master KEK."""
        aesgcm = AESGCM(self.master_kek)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, dek, None)
        # Store as nonce + ciphertext
        return (nonce + ciphertext).hex()

    def unwrap_key(self, wrapped_dek_hex: str) -> bytes:
        """Unwraps a wrapped DEK using the master KEK."""
        data = bytes.fromhex(wrapped_dek_hex)
        nonce = data[:12]
        ciphertext = data[12:]
        aesgcm = AESGCM(self.master_kek)
        try:
            return aesgcm.decrypt(nonce, ciphertext, None)
        except Exception as e:
            raise ValueError("Failed to unwrap DEK: Master key mismatch or corrupted key.") from e

    def calculate_mac(self, data: bytes) -> bytes:
        """Calculates an authentication tag for metadata using the master KEK."""
        aesgcm = AESGCM(self.master_kek)
        nonce = b"\x00" * 12  # Deterministic nonce for metadata MAC
        # Encrypting the data gives us ciphertext + tag
        result = aesgcm.encrypt(nonce, data, None)
        return result[-16:] # Return only the 16-byte tag

    def verify_mac(self, data: bytes, tag: bytes) -> bool:
        """Verifies an authentication tag for metadata."""
        # Re-calculate the tag for the given data and compare
        expected_tag = self.calculate_mac(data)
        return expected_tag == tag

    def encrypt_chunk(self, dek: bytes, chunk_idx: int, plaintext: bytes, base_nonce: bytes) -> bytes:
        """Encrypts a single chunk using AES-256-GCM. Returns [Length (4B)][Ciphertext]."""
        aesgcm = AESGCM(dek)
        # Nonce = 8 bytes base + 4 bytes counter
        nonce = base_nonce + chunk_idx.to_bytes(4, 'big')
        ciphertext = aesgcm.encrypt(nonce, plaintext, None)
        return struct.pack(">I", len(ciphertext)) + ciphertext

    def decrypt_chunk(self, dek: bytes, chunk_idx: int, ciphertext: bytes, base_nonce: bytes) -> bytes:
        """Decrypts a single chunk using AES-256-GCM. Expects ciphertext WITHOUT length prefix."""
        aesgcm = AESGCM(dek)
        nonce = base_nonce + chunk_idx.to_bytes(4, 'big')
        try:
            return aesgcm.decrypt(nonce, ciphertext, None)
        except Exception as e:
            raise FramingViolationError(f"Chunk {chunk_idx} decryption failed: Integrity check failed.") from e

    def create_header(self, total_chunks: int, chunk_size: int, base_nonce: bytes) -> bytes:
        """Constructs the versioned binary header."""
        header_payload = struct.pack(">BII12s", FORMAT_VERSION, total_chunks, chunk_size, base_nonce)
        mac = self.calculate_mac(header_payload)
        return header_payload + mac

    def verify_header(self, header_data: bytes) -> Tuple[int, int, bytes]:
        """Verifies header MAC and extracts metadata."""
        if len(header_data) != 1 + 4 + 4 + 12 + 16:
            raise FramingViolationError("Truncated or invalid header size.")

        payload = header_data[:21]
        mac = header_data[21:]

        if not self.verify_mac(payload, mac):
            raise FramingViolationError("Header authentication failed: Metadata tampered with.")

        version, total_chunks, chunk_size, base_nonce = struct.unpack(">BII12s", payload)
        if version != FORMAT_VERSION:
            raise FramingViolationError(f"Unsupported format version: {version}")

        return total_chunks, chunk_size, base_nonce

    def create_footer(self, final_hash: bytes) -> bytes:
        """Constructs the authenticated binary footer."""
        footer_payload = final_hash + END_MARKER
        mac = self.calculate_mac(footer_payload)
        return footer_payload + mac

    def verify_footer(self, footer_data: bytes, expected_hash: bytes) -> bool:
        """Verifies footer MAC, End Marker, and final hash."""
        # Footer: [Hash (32B)][EndMarker (4B)][MAC (16B)]
        if len(footer_data) != 32 + 4 + 16:
            raise FramingViolationError("Truncated or invalid footer size.")

        payload = footer_data[:36]
        mac = footer_data[36:]

        if not self.verify_mac(payload, mac):
            raise FramingViolationError("Footer authentication failed: Finalization record tampered with.")

        final_hash = payload[:32]
        end_marker = payload[32:]

        if end_marker != END_MARKER:
            raise FramingViolationError("Missing or invalid end marker: File truncated.")

        if final_hash != expected_hash:
            raise FramingViolationError("Footer hash mismatch: Final integrity check failed.")

        return True

encryption_service = EncryptionService()
