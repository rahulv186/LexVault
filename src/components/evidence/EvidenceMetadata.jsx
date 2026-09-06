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
        <MetadataItem label="Evidence ID" value={evidence.id} />
        <MetadataItem label="Filename" value={evidence.filename} />
        <MetadataItem label="File Type" value={evidence.type} />
        <MetadataItem label="File Size" value={evidence.size} />
        <MetadataItem label="Uploaded By" value={evidence.uploadedBy} />
        <MetadataItem label="Upload Timestamp" value={evidence.timestamp} />
        <MetadataItem label="Current Status" value={evidence.status} />
      </div>
    </div>
  );
};
