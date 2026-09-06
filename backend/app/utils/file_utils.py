import os
import uuid
from pathlib import Path
from app.core.config import settings

def generate_secure_filename(original_filename: str) -> str:
    """Generates a unique, secure filename to prevent path traversal and collisions."""
    extension = Path(original_filename).suffix
    # Using UUID4 to ensure a completely random and unique filename
    return f"{uuid.uuid4()}{extension}"

def save_upload_file(upload_file, original_filename: str) -> str:
    """Saves an uploaded file to the secure uploads directory."""
    stored_filename = generate_secure_filename(original_filename)
    upload_dir = Path(settings.UPLOADS_DIR)

    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / stored_filename

    with open(file_path, "wb") as f:
        # Use a chunked write to avoid loading large files into RAM
        chunk_size = 1024 * 1024
        while chunk := upload_file.file.read(chunk_size):
            f.write(chunk)

    return str(file_path)
