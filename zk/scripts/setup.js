import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { ensureBuildDir, paths, writeJson } from './common.js';

function run(command, args) {
  execFileSync(command, args, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
}

ensureBuildDir();

run('npx', [
  'circom',
  paths.circuit,
  '-r',
  paths.r1cs,
  '-w',
  paths.wasm,
  '-s',
  paths.sym,
]);

run('npx', ['snarkjs', 'powersoftau', 'new', 'bn128', '12', paths.ptau0]);
run('npx', [
  'snarkjs',
  'powersoftau',
  'contribute',
  paths.ptau0,
  paths.ptau1,
  '--name=LexVault development contribution',
  '-e=lexvault-development-setup',
]);
run('npx', ['snarkjs', 'powersoftau', 'prepare', 'phase2', paths.ptau1, paths.ptauFinal]);
run('npx', ['snarkjs', 'groth16', 'setup', paths.r1cs, paths.ptauFinal, paths.zkey0]);
run('npx', [
  'snarkjs',
  'zkey',
  'contribute',
  paths.zkey0,
  paths.zkeyFinal,
  '--name=LexVault circuit contribution',
  '-e=lexvault-evidence-commitment',
]);
run('npx', ['snarkjs', 'zkey', 'export', 'verificationkey', paths.zkeyFinal, paths.verificationKey]);

writeJson({
  ok: true,
  artifacts: {
    r1cs: fs.existsSync(paths.r1cs),
    wasm: fs.existsSync(paths.wasm),
    zkey: fs.existsSync(paths.zkeyFinal),
    verificationKey: fs.existsSync(paths.verificationKey),
  },
});
