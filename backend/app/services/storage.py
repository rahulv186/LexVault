from abc import ABC, abstractmethod
from typing import BinaryIO
import os
from pathlib import Path
from app.core.config import settings

class StorageInterface(ABC):
    @abstractmethod
    def save(self, stream: BinaryIO, filename: str) -> str:
        """Saves a stream to storage and returns a storage reference."""
        pass

    @abstractmethod
    def load(self, reference: str) -> BinaryIO:
        """Returns a readable stream for the given storage reference."""
        pass

    @abstractmethod
    def delete(self, reference: str) -> bool:
        """Deletes the object from storage."""
        pass

    @abstractmethod
    def exists(self, reference: str) -> bool:
        """Checks if the object exists in storage."""
        pass

class LocalStorage(StorageInterface):
    def __init__(self):
        self.base_dir = Path(settings.UPLOADS_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, stream: BinaryIO, filename: str) -> str:
        stored_path = self.base_dir / filename
        with open(stored_path, "wb") as f:
            while chunk := stream.read(1024 * 1024):
                f.write(chunk)
        return str(stored_path.relative_to(self.base_dir))

    def load(self, reference: str) -> BinaryIO:
        stored_path = self.base_dir / reference
        if not stored_path.exists():
            raise FileNotFoundError(f"Evidence file not found: {reference}")
        return open(stored_path, "rb")

    def delete(self, reference: str) -> bool:
        stored_path = self.base_dir / reference
        try:
            stored_path.unlink()
            return True
        except FileNotFoundError:
            return False

    def exists(self, reference: str) -> bool:
        return (self.base_dir / reference).exists()

storage_provider = LocalStorage()
