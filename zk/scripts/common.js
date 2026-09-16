import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const zkRoot = path.resolve(__dirname, '..');
export const buildDir = path.join(zkRoot, 'build');
export const circuitName = 'evidence_commitment';
export const circuitVersion = '1.0.0';
export const provingSystem = 'groth16';

export const paths = {
  circuit: path.join(zkRoot, 'circuits', `${circuitName}.circom`),
  r1cs: path.join(buildDir, `${circuitName}.r1cs`),
  wasm: path.join(buildDir, `${circuitName}.wasm`),
  sym: path.join(buildDir, `${circuitName}.sym`),
  ptau0: path.join(buildDir, 'pot12_0000.ptau'),
  ptau1: path.join(buildDir, 'pot12_0001.ptau'),
  ptauFinal: path.join(buildDir, 'pot12_final.ptau'),
  zkey0: path.join(buildDir, `${circuitName}_0000.zkey`),
  zkeyFinal: path.join(buildDir, `${circuitName}_final.zkey`),
  verificationKey: path.join(buildDir, 'verification_key.json'),
};

export const bn128Prime = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

export function ensureBuildDir() {
  fs.mkdirSync(buildDir, { recursive: true });
}

export function requireArtifacts() {
  const missing = [paths.wasm, paths.zkeyFinal, paths.verificationKey].filter((item) => !fs.existsSync(item));
  if (missing.length > 0) {
    throw new Error(`Missing ZK artifacts. Run "npm --prefix zk run setup" first. Missing: ${missing.join(', ')}`);
  }
}

export function sha256ToField(sha256Hex) {
  if (!/^[a-fA-F0-9]{64}$/.test(sha256Hex)) {
    throw new Error('Expected a 64-character SHA-256 hex string.');
  }
  return (BigInt(`0x${sha256Hex}`) % bn128Prime).toString();
}

export function deriveBlinding(evidenceId, sha256Hex) {
  const digest = crypto
    .createHash('sha256')
    .update(`LexVault ZK blinding v1:${evidenceId}:${sha256Hex}`)
    .digest('hex');
  return (BigInt(`0x${digest}`) % bn128Prime).toString();
}

export async function readJsonFromStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

export function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}
