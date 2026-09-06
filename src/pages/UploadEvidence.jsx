import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { evidenceService } from '../services/evidenceService.js';
import { Upload, CheckCircle2, Loader2, FileText, Shield, Database } from 'lucide-react';
import { cn } from '../utils/cn.js';

const PIPELINE_STEPS = [
  { id: 'select', label: 'File Selected', icon: FileText },
  { id: 'upload', label: 'Uploading to Vault', icon: Upload },
  { id: 'hash', label: 'Calculating SHA-256', icon: Shield },
  { id: 'register', label: 'Evidence Registered', icon: Database },
  { id: 'complete', label: 'Securely Archived', icon: CheckCircle2 },
];

export const UploadEvidence = () => {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStep(0);
      setError(null);
    }
  };

  const startUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setResult(null);
    setError(null);

    try {
      // Update steps to match real backend flow
      setStep(1); // Uploading
      const evidence = await evidenceService.uploadEvidence({ file });

      setStep(2); // Hashing (already done on backend, but simulating UI)
      await new Promise(r => setTimeout(r, 800));

      setStep(3); // Registered
      await new Promise(r => setTimeout(r, 800));

      setStep(4); // Complete
      setResult(evidence);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An unexpected error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setStep(-1);
    setResult(null);
    setIsUploading(false);
    setError(null);
  };

  return (
    <PageContainer title="Secure Evidence Upload">
      <div className="max-w-4xl mx-auto">
        {!file ? (
          <div
            className="border-2 border-dashed border-security-gray-700 rounded-2xl p-12 text-center hover:border-security-accent/50 transition-colors cursor-pointer bg-security-gray-900/30 group"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-16 h-16 bg-security-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-gray-400 group-hover:text-security-accent" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Drag and drop evidence file</h3>
            <p className="text-gray-500 mb-6">Supports Disk Images, PCAP, Memory Dumps, and Documents</p>
            <button className="px-6 py-2 bg-security-accent text-security-black font-bold rounded-lg hover:bg-opacity-90 transition-colors">
              Browse Files
            </button>
          </div>
        ) : !result ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4">File Details</h3>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-security-black border border-security-gray-700 mb-6">
                <FileText className="w-8 h-8 text-security-accent" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-xs">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={startUpload}
                  disabled={isUploading}
                  className="flex-1 py-3 bg-security-accent text-security-black font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isUploading ? 'Processing...' : 'Secure Evidence'}
                </button>
                <button
                  onClick={reset}
                  disabled={isUploading}
                  className="px-4 py-3 bg-security-gray-800 text-white font-bold rounded-lg hover:bg-security-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-6">Security Pipeline</h3>
              <div className="space-y-4">
                {PIPELINE_STEPS.map((s, i) => (
                  <div key={s.id} className={cn(
                    'flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
                    step === i ? 'bg-security-accent/10 border border-security-accent/30' :
                    step > i ? 'bg-security-gray-800/50 border border-security-gray-700' : 'opacity-40'
                  )}>
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                      step > i ? 'bg-security-accent text-security-black' :
                      step === i ? 'bg-security-accent animate-pulse text-security-black' : 'bg-security-gray-700 text-gray-500'
                    )}>
                      {step > i ? <CheckCircle2 className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
                    </div>
                    <span className={cn(
                      'text-sm font-medium',
                      step === i ? 'text-security-accent' : 'text-gray-300'
                    )}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="glass-card p-8 text-center">
              <div className="w-20 h-20 bg-security-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-security-accent" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Evidence Successfully Secured</h2>
              <p className="text-gray-400 mb-8">The file has been hashed, registered, and safely archived in the vault.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8">
                <div className="p-4 rounded-lg bg-security-black border border-security-gray-700">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Evidence ID</p>
                  <p className="text-sm font-mono text-white">{result.evidence_id}</p>
                </div>
                <div className="p-4 rounded-lg bg-security-black border border-security-gray-700">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">SHA-256 (Plaintext)</p>
                  <p className="text-sm font-mono text-white truncate">{result.sha256}</p>
                </div>
                <div className="p-4 rounded-lg bg-security-black border border-security-gray-700">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">File Size</p>
                  <p className="text-sm font-mono text-white">{result.file_size} bytes</p>
                </div>
                <div className="p-4 rounded-lg bg-security-black border border-security-gray-700">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Encryption</p>
                  <p className="text-sm font-mono text-security-accent">AES-256-GCM</p>
                </div>
                <div className="p-4 rounded-lg bg-security-black border border-security-gray-700 col-span-1 md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Timestamp</p>
                  <p className="text-sm font-mono text-white">{new Date(result.uploaded_at).toLocaleString()}</p>
                </div>
              </div>

              <button
                onClick={reset}
                className="px-6 py-3 bg-security-accent text-security-black font-bold rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Upload Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default UploadEvidence;
