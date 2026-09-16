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

## Zero-Knowledge Proof Prototype

LexVault includes a first real ZK proof workflow using Circom, snarkjs, and Groth16. The circuit lives in `../zk/circuits/evidence_commitment.circom`.

### What It Proves
The `evidence_commitment` circuit proves that the prover knows private field values that satisfy this public commitment:

```text
commitment = evidenceHash^2 + evidenceHash * blinding + blinding^2
```

### Private Inputs
- `evidenceHash`: a field element derived off-chain from the stored SHA-256 evidence fingerprint.
- `blinding`: a private field element used during proof generation.

### Public Inputs
- `commitment`: the circuit-friendly commitment exposed as the public signal.

### Important Limitation
This first circuit does not prove SHA-256 over the full evidence file inside the circuit. LexVault still computes the plaintext SHA-256 off-chain for evidence integrity. The ZK proof demonstrates a real commitment proof associated with an evidence record without exposing the private witness.

It also does not prove AES-GCM encryption, IPFS storage, database state, or custody-chain hashing.

### Development Setup
The Groth16 setup is a local prototype trusted setup for hackathon/demo use only.

```bash
npm --prefix ../zk install
npm --prefix ../zk run setup
```

Generate a proof:

```bash
printf '{"evidence_id":"EV-2026-000001","sha256":"<64 hex chars>"}' | npm --prefix ../zk run prove
```

Verify a proof:

```bash
printf '{"proof":{...},"public_signals":["..."]}' | npm --prefix ../zk run verify
```

Backend endpoints:
- `GET /api/zk/proofs/`
- `POST /api/zk/proofs/`
- `POST /api/zk/proofs/{proof_id}/verify/`

All endpoints require JWT authentication and DB-backed RBAC permissions.

## ⚠️ Security Warnings
- **Key Management**: Never commit the `.env` file. If the master key is lost, all encrypted evidence is permanently undecryptable.
- **Plaintext**: No plaintext evidence is ever stored permanently on disk.
- **GCM Nonce**: Nonces are randomly generated per file to prevent key-stream reuse.
- **ZK Witnesses**: Private ZK witness values are not stored in the database.

## 🗺️ Roadmap
- **Current**: SHA-256 + AES-256-GCM + PostgreSQL + optional IPFS + custody-chain verification + real Groth16 commitment proof
- **Future**: Blockchain anchoring, production trusted setup, richer ZK circuits, cryptographic chain-of-custody signatures.
