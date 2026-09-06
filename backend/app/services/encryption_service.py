import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings
from pathlib import Path

CHUNK_SIZE = 1024 * 1024 # 1MB chunks

class EncryptionService:
    def __init__(self):
        self.key = settings.encryption_key
        self.algorithm = "AES-256-GCM"

    def encrypt_file(self, input_path: str, output_path: str) -> str:
        """
        Encrypts a file using AES-256-GCM in chunks.
        Each chunk is encrypted as an independent GCM message.
        The nonce for chunk i is (base_nonce[0:8] + counter_i[4 bytes]).
        Returns the base_nonce as a hex string.
        """
        base_nonce = os.urandom(8)
        aesgcm = AESGCM(self.key)

        encrypted_size = 0
        with open(input_path, "rb") as f_in, open(output_path, "wb") as f_out:
            chunk_idx = 0
            while chunk := f_in.read(CHUNK_SIZE):
                # Nonce = 8 bytes base + 4 bytes counter = 12 bytes
                nonce = base_nonce + chunk_idx.to_bytes(4, 'big')
                ciphertext = aesgcm.encrypt(nonce, chunk, None)
                f_out.write(ciphertext)
                encrypted_size += len(ciphertext)
                chunk_idx += 1

        return base_nonce.hex(), encrypted_size

    def decrypt_file(self, input_path: str, output_path: str, base_nonce_hex: str):
        """
        Decrypts a file encrypted by encrypt_file.
        Expects the same chunk size and nonce construction.
        """
        base_nonce = bytes.fromhex(base_nonce_hex)
        aesgcm = AESGCM(self.key)

        # Each encrypted chunk is CHUNK_SIZE + 16 bytes (tag)
        encrypted_chunk_size = CHUNK_SIZE + 16

        with open(input_path, "rb") as f_in, open(output_path, "wb") as f_out:
            chunk_idx = 0
            while chunk := f_in.read(encrypted_chunk_size):
                nonce = base_nonce + chunk_idx.to_bytes(4, 'big')
                try:
                    plaintext = aesgcm.decrypt(nonce, chunk, None)
                    f_out.write(plaintext)
                except Exception as e:
                    raise ValueError("Decryption failed: Integrity check failed (tampered file).") from e
                chunk_idx += 1

encryption_service = EncryptionService()
