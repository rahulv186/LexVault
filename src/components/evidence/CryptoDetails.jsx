import React from 'react';
import { Lock, Globe, Hash, Clock, Database } from 'lucide-react';

const CryptoItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-security-black border border-security-gray-700 group hover:border-security-accent/50 transition-colors">
    <div className="mt-1 text-gray-500 group-hover:text-security-accent transition-colors">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{label}</p>
      <p className="text-xs font-mono text-gray-300 break-all">{value}</p>
    </div>
  </div>
);

export const CryptoDetails = ({ evidence }) => {
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-bold text-white mb-6">Cryptographic Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CryptoItem
          icon={<Hash className="w-4 h-4" />}
          label="SHA-256 Hash"
          value={evidence.hash}
        />
        <CryptoItem
          icon={<Lock className="w-4 h-4" />}
          label="Encryption"
          value="AES-256-GCM"
        />
        <CryptoItem
          icon={<Globe className="w-4 h-4" />}
          label="IPFS CID"
          value={evidence.cid}
        />
        <CryptoItem
          icon={<Database className="w-4 h-4" />}
          label="Blockchain TX"
          value={evidence.txHash}
        />
        <CryptoItem
          icon={<Clock className="w-4 h-4" />}
          label="Anchor Timestamp"
          value={evidence.anchorTimestamp}
        />
        <CryptoItem
          icon={<Database className="w-4 h-4" />}
          label="Block Number"
          value={evidence.blockNumber.toString()}
        />
      </div>
    </div>
  );
};
