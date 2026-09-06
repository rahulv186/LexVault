import React from 'react';
import { ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export const EvidenceStatusIndicator = ({ status }) => {
  const isVerified = status === 'Verified';
  const isTampered = status === 'Tampered';

  return (
    <div className={cn(
      'p-8 rounded-2xl border-2 flex flex-col items-center justify-center text-center gap-4 transition-all duration-500',
      isVerified ? 'bg-security-accent/10 border-security-accent text-security-accent' :
      isTampered ? 'bg-red-500/10 border-red-500 text-red-500' :
      'bg-yellow-500/10 border-yellow-500 text-yellow-500'
    )}>
      {isVerified ? <ShieldCheck className="w-16 h-16" /> : isTampered ? <ShieldAlert className="w-16 h-16" /> : <Clock className="w-16 h-16" />}
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-widest">
          {isVerified ? 'Integrity Verified' : isTampered ? 'Integrity Compromised' : 'Pending Verification'}
        </h2>
        <p className="text-sm opacity-80 mt-1">
          {isVerified ? 'Cryptographic hashes match the blockchain anchor.' :
           isTampered ? 'Hash mismatch detected. Evidence has been modified.' :
           'Evidence is currently being processed in the vault.'}
        </p>
      </div>
    </div>
  );
};
