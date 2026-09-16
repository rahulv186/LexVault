import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { zkService } from '../services/zkService.js';
import { Zap, ShieldCheck, ShieldX, Loader2, Info, Search } from 'lucide-react';
import { cn } from '../utils/cn.js';
import { useAuth } from '../context/AuthContext.jsx';
import { hasPermission } from '../utils/permissions.js';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : 'Not verified');

const getStatusClass = (status) => {
  if (status === 'VERIFIED') return 'bg-security-accent/10 text-security-accent';
  if (status === 'INVALID' || status === 'FAILED') return 'bg-red-500/10 text-red-400';
  if (status === 'VERIFYING' || status === 'GENERATING') return 'bg-yellow-500/10 text-yellow-400';
  return 'bg-security-gray-800 text-gray-400';
};

export const ZKProofs = () => {
  const { user } = useAuth();
  const canGenerate = hasPermission(user, 'zk:generate');
  const canVerify = hasPermission(user, 'zk:verify');
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [verifyingProofId, setVerifyingProofId] = useState(null);
  const [evidenceId, setEvidenceId] = useState('');
  const [error, setError] = useState(null);

  const loadProofs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await zkService.getAllProofs();
      setProofs(data);
    } catch (err) {
      if (!axios.isCancel(err)) {
        setError(err.response?.data?.detail || 'Failed to load ZK proofs');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProofs();
  }, []);

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!evidenceId.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
      const newProof = await zkService.generateProof(evidenceId.trim());
      setProofs((items) => [newProof, ...items]);
      setEvidenceId('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Proof generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerify = async (proofId) => {
    setVerifyingProofId(proofId);
    setError(null);
    try {
      const result = await zkService.verifyProof(proofId);
      setProofs((items) => items.map((proof) => (
        proof.proof_id === proofId
          ? {
              ...proof,
              status: result.status,
              verification_result: result.valid,
              verified_at: result.verified_at,
            }
          : proof
      )));
    } catch (err) {
      setError(err.response?.data?.detail || 'Proof verification failed');
    } finally {
      setVerifyingProofId(null);
    }
  };

  if (loading) {
    return (
      <PageContainer title="ZK Proofs">
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-security-accent border-t-transparent" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Zero-Knowledge Proofs">
      <div className="glass-card mb-8 flex items-start gap-4 border-l-4 border-l-security-accent p-6">
        <Info className="mt-1 h-6 w-6 text-security-accent" />
        <div>
          <h3 className="mb-1 font-bold text-white">Evidence Commitment Proof</h3>
          <p className="text-sm leading-relaxed text-gray-400">
            LexVault now generates a real Circom/snarkjs Groth16 proof that demonstrates knowledge of a private field witness derived from the stored evidence fingerprint and a private blinding value. It does not reveal the evidence file, AES key, private witness, or claim to prove full-file SHA-256 inside the circuit.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Registered Proofs</h3>
          <p className="text-xs text-gray-500">Proofs are generated and verified by the backend using snarkjs.</p>
        </div>

        {canGenerate && (
          <form onSubmit={handleGenerate} className="flex w-full gap-3 lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={evidenceId}
                onChange={(event) => setEvidenceId(event.target.value)}
                placeholder="Evidence ID, e.g. EV-2026-000001"
                className="w-full rounded-lg border border-security-gray-700 bg-security-gray-900 py-2 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:border-security-accent focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isGenerating || !evidenceId.trim()}
              className="flex items-center gap-2 rounded-lg bg-security-accent px-4 py-2 text-sm font-bold text-security-black transition-colors hover:bg-opacity-90 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isGenerating ? 'Generating...' : 'Generate Proof'}
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {proofs.map((proof) => {
          const verifying = verifyingProofId === proof.proof_id;
          const verified = proof.verification_result === true;
          const invalid = proof.verification_result === false;

          return (
            <div key={proof.proof_id} className="glass-card p-6 transition-colors hover:border-security-accent/50">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold text-white">{proof.proof_id}</h4>
                  <p className="text-xs text-gray-500">Evidence: {proof.evidence_public_id}</p>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', getStatusClass(proof.status))}>
                  {proof.status}
                </span>
              </div>

              <div className="mb-6 space-y-3">
                <div className="flex justify-between gap-4 border-b border-security-gray-800 py-2">
                  <span className="text-xs text-gray-500">Circuit</span>
                  <span className="text-right text-xs font-medium text-white">{proof.circuit_name} v{proof.circuit_version}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-security-gray-800 py-2">
                  <span className="text-xs text-gray-500">Proof System</span>
                  <span className="text-xs font-medium text-white">{proof.proving_system}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-security-gray-800 py-2">
                  <span className="text-xs text-gray-500">Created</span>
                  <span className="text-right text-xs text-white">{formatDate(proof.created_at)}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-security-gray-800 py-2">
                  <span className="text-xs text-gray-500">Verified</span>
                  <span className="text-right text-xs text-white">{formatDate(proof.verified_at)}</span>
                </div>
                <div className="rounded-lg border border-security-gray-800 bg-security-black p-3">
                  <p className="mb-1 text-xs font-bold uppercase text-gray-500">Public Inputs</p>
                  <p className="break-all font-mono text-xs text-security-accent">
                    commitment: {proof.public_inputs?.commitment || proof.public_signals?.[0] || 'Unavailable'}
                  </p>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-2 text-sm">
                {verified && (
                  <>
                    <ShieldCheck className="h-4 w-4 text-security-accent" />
                    <span className="font-bold text-security-accent">Zero-Knowledge Proof Verified</span>
                  </>
                )}
                {invalid && (
                  <>
                    <ShieldX className="h-4 w-4 text-red-400" />
                    <span className="font-bold text-red-400">Zero-Knowledge Proof Invalid</span>
                  </>
                )}
              </div>

              {canVerify && (
                <button
                  onClick={() => handleVerify(proof.proof_id)}
                  disabled={verifying}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-security-accent py-2 text-xs font-bold text-security-black transition-colors hover:bg-opacity-90 disabled:opacity-50"
                >
                  {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
                  {verifying ? 'Verifying...' : 'Verify Proof'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {proofs.length === 0 && (
        <div className="glass-card p-10 text-center text-gray-500">
          No ZK proofs have been generated yet.
        </div>
      )}
    </PageContainer>
  );
};

export default ZKProofs;
