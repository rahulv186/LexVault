import React from 'react';
import { CheckCircle2, Clock, Lock, Globe, Database, ShieldCheck, Upload, Hash } from 'lucide-react';
import { cn } from '../../utils/cn.js';

const PROVENANCE_STEPS = [
  { label: 'Evidence Created', icon: Clock, description: 'Original capture timestamp recorded.' },
  { label: 'Evidence Uploaded', icon: Upload, description: 'Secure transfer to LexVault encrypted gateway.' },
  { label: 'SHA-256 Generated', icon: Hash, description: 'Unique cryptographic fingerprint created.' },
  { label: 'Encrypted', icon: Lock, description: 'AES-256-GCM encryption applied to evidence body.' },
  { label: 'Stored on IPFS', icon: Globe, description: 'Distributed content addressing assigned.' },
  { label: 'Blockchain Anchor', icon: Database, description: 'Hash committed to immutable public ledger.' },
  { label: 'Verification', icon: ShieldCheck, description: 'Integrity check completed against anchor.' },
];

const Step = ({ step, isLast, isCompleted }) => {
  const Icon = step.icon;
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors z-10',
          isCompleted ? 'bg-security-accent border-security-accent text-security-black' : 'bg-security-gray-900 border-security-gray-700 text-gray-500'
        )}>
          <Icon className="w-5 h-5" />
        </div>
        {!isLast && <div className="w-px h-12 bg-security-gray-700 my-2"></div>}
      </div>
      <div className="pb-8">
        <h4 className={cn('text-sm font-bold', isCompleted ? 'text-white' : 'text-gray-500')}>
          {step.label}
        </h4>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">{step.description}</p>
        {isCompleted && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono text-security-accent">Verified: 0x82a...91a</span>
            <span className="text-[10px] text-gray-600">|</span>
            <span className="text-[10px] text-gray-500">2026-09-05 21:30</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const ProvenanceTimeline = () => {
  return (
    <div className="glass-card p-8">
      <h3 className="text-lg font-bold text-white mb-8">Provenance Timeline</h3>
      <div className="space-y-0">
        {PROVENANCE_STEPS.map((step, i) => (
          <Step
            key={i}
            step={step}
            isLast={i === PROVENANCE_STEPS.length - 1}
            isCompleted={true}
          />
        ))}
      </div>
    </div>
  );
};
