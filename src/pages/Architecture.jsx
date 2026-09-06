import React from 'react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { ArrowDown, ArrowRight, Cpu, Lock, Globe, Database, Shield, Zap, Layers, ShieldCheck } from 'lucide-react';
import { cn } from '../utils/cn.js';

const ArchNode = ({ icon: Icon, title, tech, description, color = 'text-gray-400' }) => (
  <div className="glass-card p-4 flex flex-col items-center text-center relative z-10 group hover:border-security-accent transition-colors">
    <div className={cn('p-3 rounded-xl bg-security-black border border-security-gray-700 mb-3 group-hover:scale-110 transition-transform', color)}>
      <Icon className="w-6 h-6" />
    </div>
    <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
    <span className="text-[10px] font-mono text-security-accent uppercase mb-2">{tech}</span>
    <p className="text-[11px] text-gray-500 leading-tight">{description}</p>
  </div>
);

export const Architecture = () => {
  return (
    <PageContainer title="System Architecture">
      <div className="relative p-8 bg-security-gray-900/30 rounded-3xl border border-security-gray-700 overflow-hidden">
        {/* Background decorative grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle, #00ffaa 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative z-10 flex flex-col items-center gap-12">
          {/* Tier 1: Interface */}
          <div className="flex justify-center w-full">
            <ArchNode
              icon={Layers}
              title="User Interface"
              tech="React / Vite / JS"
              description="Secure Dashboard & Evidence Management UI"
            />
          </div>

          <ArrowDown className="w-6 h-6 text-gray-600" />

          {/* Tier 2: API Gateway */}
          <div className="flex justify-center w-full">
            <ArchNode
              icon={Cpu}
              title="API Gateway"
              tech="FastAPI / Python"
              description="Request validation & orchestration layer"
            />
          </div>

          <div className="flex items-center gap-8 w-full justify-center">
            <ArrowRight className="w-6 h-6 text-gray-600 rotate-90" />
            <ArrowRight className="w-6 h-6 text-gray-600 rotate-90" />
            <ArrowRight className="w-6 h-6 text-gray-600 rotate-90" />
          </div>

          {/* Tier 3: Processing Layers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-6xl">
            {/* Storage Layer */}
            <div className="flex flex-col items-center gap-6">
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Storage & Privacy</h5>
              <div className="space-y-6 w-full">
                <ArchNode
                  icon={Lock}
                  title="Encryption"
                  tech="AES-256-GCM"
                  description="End-to-end encryption of forensic data"
                />
                <ArrowDown className="w-4 h-4 mx-auto text-gray-600" />
                <ArchNode
                  icon={Globe}
                  title="Vault Storage"
                  tech="IPFS / Filecoin"
                  description="Decentralized immutable content storage"
                />
              </div>
            </div>

            {/* Integrity Layer */}
            <div className="flex flex-col items-center gap-6">
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Integrity & Truth</h5>
              <div className="space-y-6 w-full">
                <ArchNode
                  icon={Shield}
                  title="Hashing"
                  tech="SHA-256"
                  description="Deterministic cryptographic identity"
                />
                <ArrowDown className="w-4 h-4 mx-auto text-gray-600" />
                <ArchNode
                  icon={Database}
                  title="Blockchain"
                  tech="Solidity / Ethereum"
                  description="Immutable timestamp anchoring"
                />
              </div>
            </div>

            {/* Verification Layer */}
            <div className="flex flex-col items-center gap-6">
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Verifiable Proofs</h5>
              <div className="space-y-6 w-full">
                <ArchNode
                  icon={Zap}
                  title="ZK Proofs"
                  tech="Circom / Groth16"
                  description="Zero-Knowledge evidence verification"
                />
                <ArrowDown className="w-4 h-4 mx-auto text-gray-600" />
                <ArchNode
                  icon={ShieldCheck}
                  title="Audit Log"
                  tech="Immutable Log"
                  description="Cryptographically signed custody chain"
                />
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 rounded-xl bg-security-black border border-security-gray-700 max-w-3xl text-center">
            <p className="text-sm text-gray-400 leading-relaxed">
              <span className="text-security-accent font-bold">Architecture Note:</span> The system decouples
              <span className="text-white"> encrypted evidence storage (IPFS)</span> from
              <span className="text-white"> integrity proof (Blockchain)</span>.
              This ensures that even if a storage node is compromised, the evidence integrity
              can be independently verified using the public anchor.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Architecture;
