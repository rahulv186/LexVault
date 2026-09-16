/*
  LexVault Evidence Commitment Circuit

  PRIVATE INPUTS
  - evidenceHash: a field element derived off-chain from the stored SHA-256
    evidence fingerprint.
  - blinding: a private random field element used only during proof generation.

  PUBLIC SIGNALS
  - commitment: a circuit-friendly commitment emitted by the circuit.

  CONSTRAINTS
  - commitment = evidenceHash^2 + evidenceHash * blinding + blinding^2

  WHAT THIS PROOF REVEALS
  - The prover knows private field values that satisfy the public commitment.

  WHAT THIS PROOF DOES NOT REVEAL
  - The original evidence file.
  - The AES-GCM encryption key.
  - The plaintext SHA-256 value as a public circuit input.
  - A ZK proof of the complete SHA-256 algorithm over an arbitrary file.

  This is intentionally a small prototype circuit for demonstrating a real
  Groth16 proof workflow in LexVault.
*/

template EvidenceCommitment() {
    signal private input evidenceHash;
    signal private input blinding;
    signal output commitment;

    signal hashSquared;
    signal hashTimesBlinding;
    signal blindingSquared;

    hashSquared <== evidenceHash * evidenceHash;
    hashTimesBlinding <== evidenceHash * blinding;
    blindingSquared <== blinding * blinding;

    commitment <== hashSquared + hashTimesBlinding + blindingSquared;
}

component main = EvidenceCommitment();
