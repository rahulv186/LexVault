import React, { useEffect, useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { zkService } from '../services/zkService.js';
import { Zap, ShieldCheck, Loader2, Info } from 'lucide-react';
import { cn } from '../utils/cn.js';

export const ZKProofs = () => {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    zkService.getAllProofs().then(data => {
      setProofs(data);
      setLoading(false);
    });
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const newProof = await zkService.generateProof('EV-2026-00150');
      setProofs([newProof, ...proofs]);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="ZK Proofs">
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-security-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Zero-Knowledge Proofs">
      <div className="glass-card p-6 mb-8 flex items-start gap-4 border-l-4 border-l-security-accent">
        <Info className="w-6 h-6 text-security-accent mt-1" />
        <div>
          <h3 className="text-white font-bold mb-1">What are ZK Proofs?</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Zero-Knowledge Proofs allow LexVault to verify a claim (e.g., "the evidence hash matches the anchor")
            without revealing the actual sensitive evidence content to the verifier. This preserves
            confidentiality while maintaining absolute cryptographic certainty of integrity.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">Registered Proofs</h3>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-4 py-2 bg-security-accent text-security-black font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
          {isGenerating ? 'Generating...' : <><Zap className="w-4 h-4" /> Generate Proof</>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {proofs.map(proof => (
          <div key={proof.id} className="glass-card p-6 hover:border-security-accent/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-white font-bold">{proof.id}</h4>
                <p className="text-xs text-gray-500">Evidence: {proof.evidenceId}</p>
              </div>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                proof.status === 'VALID' ? 'bg-security-accent/10 text-security-accent' : 'bg-red-500/10 text-red-500'
              )}>
                {proof.status}
              </span>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b border-security-gray-800">
                <span className="text-xs text-gray-500">Circuit</span>
                <span className="text-xs text-white font-medium">{proof.circuit}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-security-gray-800">
                <span className="text-xs text-gray-500">Statement</span>
                <span className="text-xs text-white font-medium text-right max-w-[200px]">{proof.statement}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-security-gray-800">
                <span className="text-xs text-gray-500">Verifier Status</span>
                <span className={cn(
                  'text-xs font-bold',
                  proof.verifierStatus === 'Verified' ? 'text-security-accent' : 'text-red-400'
                )}>{proof.verifierStatus}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-security-gray-800 text-white text-xs font-bold rounded-lg hover:bg-security-gray-700 transition-colors">
                View Public Inputs
              </button>
              <button className="flex-1 py-2 bg-security-accent text-security-black text-xs font-bold rounded-lg hover:bg-opacity-90 transition-colors">
                Verify Proof
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
};

export default ZKProofs;
