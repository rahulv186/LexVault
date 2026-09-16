import fs from 'node:fs';
import * as snarkjs from 'snarkjs';
import { paths, readJsonFromStdin, requireArtifacts, writeJson } from './common.js';

requireArtifacts();

const input = await readJsonFromStdin();

if (!input.proof || !Array.isArray(input.public_signals)) {
  throw new Error('proof and public_signals are required.');
}

const verificationKey = JSON.parse(fs.readFileSync(paths.verificationKey, 'utf8'));
const valid = await snarkjs.groth16.verify(
  verificationKey,
  input.public_signals,
  input.proof,
);

writeJson({ valid });

process.exit(0);
