import React from 'react';
import { Lock, Globe, Hash, Clock, Database } from 'lucide-react';
import { cn } from '../../utils/cn.js';

const CryptoItem = ({ icon, label, value, isFuture = false }) => (
  <div className={cn(
    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
    isFuture ? "bg-security-black/50 border-security-gray-800 opacity-60" : "bg-security-black border-security-gray-700 group hover:border-security-accent/50"
  )}>
    <div className={cn(
      "mt-1 transition-colors",
      isFuture ? "text-gray-600" : "text-gray-500 group-hover:text-security-accent"
    )}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{label}</p>
      <p className={cn(
        "text-xs font-mono break-all",
        isFuture ? "text-gray-600 italic" : "text-gray-300"
      )}>
        {value || (isFuture ? "Not anchored yet" : "Not provided")}
      </p>
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
          value={evidence.sha256}
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
          isFuture={true}
        />
        <CryptoItem
          icon={<Database className="w-4 h-4" />}
          label="Blockchain TX"
          value={evidence.txHash}
          isFuture={true}
        />
        <CryptoItem
          icon={<Clock className="w-4 h-4" />}
          label="Anchor Timestamp"
          value={evidence.anchorTimestamp}
          isFuture={true}
        />
        <CryptoItem
          icon={<Database className="w-4 h-4" />}
          label="Block Number"
          value={evidence.blockNumber?.toString()}
          isFuture={true}
        />
      </div>
    </div>
  );
};
