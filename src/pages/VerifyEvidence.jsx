import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { evidenceService } from '../services/evidenceService.js';
import { Search, ShieldCheck, ShieldAlert, Loader2, Upload } from 'lucide-react';
import { cn } from '../utils/cn.js';

export const VerifyEvidence = () => {
  const [id, setId] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to verify');
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await evidenceService.verifyEvidence({ id, file });
      setResult(res);
    } catch (error) {
      console.error(error);
      setError(error.response?.data?.detail || 'An unexpected error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Forensic Verification">
      <div className="max-w-3xl mx-auto">
        <div className="glass-card p-8 mb-8">
          <h3 className="text-lg font-bold text-white mb-6">Verify Evidence Integrity</h3>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Evidence ID</label>
                <input
                  type="text"
                  placeholder="EV-2026-XXXX"
                  className="w-full bg-security-black border border-security-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-security-accent transition-colors"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Evidence File</label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-security-black border border-security-gray-700 rounded-lg text-sm text-gray-400 cursor-pointer hover:border-security-accent transition-colors overflow-hidden">
                    <Upload className="w-4 h-4" />
                    <span className="truncate">{file ? file.name : 'Select file...'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      required
                    />
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-security-accent text-security-black font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Running Verification...' : 'Verify Evidence Integrity'}
            </button>
          </form>
        </div>

        {result && (
          <div className={cn(
            'glass-card p-8 border-2 transition-all duration-500',
            result.verified ? 'border-security-accent bg-security-accent/5' : 'border-red-500 bg-red-500/5'
          )}>
            <div className="flex items-center gap-4 mb-8">
              {result.verified ? (
                <ShieldCheck className="w-12 h-12 text-security-accent" />
              ) : (
                <ShieldAlert className="w-12 h-12 text-red-500" />
              )}
              <div>
                <h2 className={cn(
                  'text-2xl font-bold uppercase tracking-widest',
                  result.verified ? 'text-security-accent' : 'text-red-500'
                )}>
                  {result.verified ? 'Integrity Verified' : 'Integrity Compromised'}
                </h2>
                <p className="text-sm text-gray-400">Verification complete. Results are cryptographically signed.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-security-gray-800">
                  <span className="text-sm text-gray-500">Original Hash</span>
                  <span className="text-sm font-mono text-white truncate ml-4">{result.original_hash}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-security-gray-800">
                  <span className="text-sm text-gray-500">Current Hash</span>
                  <span className={cn(
                    'text-sm font-mono truncate ml-4',
                    result.verified ? 'text-white' : 'text-red-400'
                  )}>{result.current_hash}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-security-gray-800">
                  <span className="text-sm text-gray-500">Blockchain Anchor</span>
                  <span className={cn(
                    'text-sm font-bold uppercase',
                    result.verified ? 'text-security-accent' : 'text-red-400'
                  )}>VALID</span>
                </div>
                <div className="flex justify-between py-2 border-b border-security-gray-800">
                  <span className="text-sm text-gray-500">Chain of Custody</span>
                  <span className={cn(
                    'text-sm font-bold uppercase',
                    result.verified ? 'text-security-accent' : 'text-red-400'
                  )}>VALID</span>
                </div>
                <div className="flex justify-between py-2 border-b border-security-gray-800">
                  <span className="text-sm text-gray-500">ZK Proof</span>
                  <span className={cn(
                    'text-sm font-bold uppercase',
                    result.verified ? 'text-security-accent' : 'text-red-400'
                  )}>VALID</span>
                </div>
                <div className="flex justify-between py-2 border-b border-security-gray-800">
                  <span className="text-sm text-gray-500">Timestamp</span>
                  <span className={cn(
                    'text-sm font-bold uppercase',
                    result.verified ? 'text-security-accent' : 'text-red-400'
                  )}>VALID</span>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 rounded-lg bg-security-black border border-security-gray-700 text-center">
              <p className={cn(
                'text-sm font-medium',
                result.verified ? 'text-gray-300' : 'text-red-400'
              )}>
                {result.verified ? 'Evidence has not been modified since anchoring.' : result.message}
              </p>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default VerifyEvidence;
