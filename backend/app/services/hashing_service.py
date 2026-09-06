import hashlib

def calculate_sha256(file_path: str) -> str:
    """Calculates the SHA-256 hash of a file using chunked reads to avoid loading large files into RAM."""
    sha256_hash = hashlib.sha256()
    # Use 1MB chunks for efficient reading of large forensic images
    chunk_size = 1024 * 1024

    with open(file_path, "rb") as f:
        while chunk := f.read(chunk_size):
            sha256_hash.update(chunk)

    return sha256_hash.hexdigest()
