# LexVault Backend API

Secure evidence management API for digital forensics.

## 🔐 Encryption Architecture
This version implements **AES-256-GCM (Galois/Counter Mode)** for evidence storage.

### Storage Flow
1. **Plaintext Processing**: Uploaded files are stored temporarily.
2. **Integrity Fingerprint**: SHA-256 hash is calculated on the original plaintext.
3. **Encrypted Storage**: The file is encrypted using a 32-byte master key and a random 12-byte nonce.
4. **Metadata**: The nonce, encrypted size, and algorithm are stored in PostgreSQL.
5. **Cleanup**: Plaintext temporary files are immediately deleted.

### Design: Chunked GCM
To support large forensic images (disk dumps, memory captures), the system uses a chunked AES-GCM approach:
- Files are split into 1MB chunks.
- Each chunk is encrypted as a separate GCM message.
- The nonce for chunk $i$ is derived from `base_nonce + counter_i`.
- This ensures the entire file is authenticated and encrypted without loading it all into RAM.

### Verification Flow
Verification follows a "Decrypt $\rightarrow$ Hash $\rightarrow$ Compare" pipeline:
`Encrypted File` $\rightarrow$ `AES-GCM Decrypt` $\rightarrow$ `Plaintext` $\rightarrow$ `SHA-256` $\rightarrow$ `Comparison with DB`

## ⚙️ Configuration

### Environment Variables
Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql+psycopg://<user>:<password>@localhost:5432/lexvault
CORS_ORIGINS=http://localhost:5173
LEXVAULT_ENCRYPTION_KEY=<64_char_hex_string>
```

### Key Generation
The `LEXVAULT_ENCRYPTION_KEY` must be exactly 32 bytes (64 hexadecimal characters).
Generate one using:
`python3 -c "import secrets; print(secrets.token_hex(32))"`

## 🚀 Getting Started

### Installation
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Database Setup
```bash
alembic upgrade head
```

### Running the API
```bash
uvicorn app.main:app --reload
```

## ⚠️ Security Warnings
- **Key Management**: Never commit the `.env` file. If the master key is lost, all encrypted evidence is permanently undecryptable.
- **Plaintext**: No plaintext evidence is ever stored permanently on disk.
- **GCM Nonce**: Nonces are randomly generated per file to prevent key-stream reuse.

## 🗺️ Roadmap
- **Current**: SHA-256 + AES-256-GCM + PostgreSQL
- **Future**: IPFS storage, Blockchain anchoring, ZK proofs for integrity, Cryptographic chain-of-custody signatures.
