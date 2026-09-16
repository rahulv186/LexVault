import * as snarkjs from 'snarkjs';
import {
  circuitName,
  circuitVersion,
  deriveBlinding,
  paths,
  provingSystem,
  readJsonFromStdin,
  requireArtifacts,
  sha256ToField,
  writeJson,
} from './common.js';

requireArtifacts();

const input = await readJsonFromStdin();
const evidenceId = input.evidence_id;
const sha256 = input.sha256;

if (!evidenceId || typeof evidenceId !== 'string') {
  throw new Error('evidence_id is required.');
}

const evidenceHash = sha256ToField(sha256);
const blinding = deriveBlinding(evidenceId, sha256);

const { proof, publicSignals } = await snarkjs.groth16.fullProve(
  {
    evidenceHash,
    blinding,
  },
  paths.wasm,
  paths.zkeyFinal,
);

writeJson({
  circuit_name: circuitName,
  circuit_version: circuitVersion,
  proving_system: provingSystem,
  public_inputs: {
    commitment: publicSignals[0],
  },
  public_signals: publicSignals,
  proof,
});

process.exit(0);
