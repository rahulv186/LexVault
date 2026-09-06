import React from 'react';

const MetadataItem = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-security-gray-800 last:border-0">
    <span className="text-gray-500 text-sm">{label}</span>
    <span className="text-white text-sm font-medium">{value}</span>
  </div>
);

export const EvidenceMetadata = ({ evidence }) => {
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-bold text-white mb-4">General Metadata</h3>
      <div className="space-y-1">
        <MetadataItem label="Evidence ID" value={evidence.evidence_id} />
        <MetadataItem label="Filename" value={evidence.original_filename} />
        <MetadataItem label="File Type" value={evidence.mime_type || 'Unknown'} />
        <MetadataItem label="File Size" value={`${(evidence.file_size / 1024).toFixed(2)} KB`} />
        <MetadataItem label="SHA-256" value={evidence.sha256} />
        <MetadataItem label="Uploaded By" value={evidence.uploaded_by} />
        <MetadataItem label="Upload Timestamp" value={new Date(evidence.uploaded_at).toLocaleString()} />
        <MetadataItem label="Current Status" value={evidence.verification_status} />
        <MetadataItem label="Encryption" value={evidence.encryption_algorithm || 'Not specified'} />
        <MetadataItem label="Encrypted Size" value={evidence.encrypted_file_size ? `${(evidence.encrypted_file_size / 1024).toFixed(2)} KB` : 'N/A'} />
      </div>
    </div>
  );
};
