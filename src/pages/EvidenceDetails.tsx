import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { EvidenceStatusIndicator } from '../components/evidence/EvidenceStatus';
import { EvidenceMetadata } from '../components/evidence/EvidenceMetadata';
import { CryptoDetails } from '../components/evidence/CryptoDetails';
import { ProvenanceTimeline } from '../components/evidence/ProvenanceTimeline';
import { CustodyTimeline } from '../components/evidence/CustodyTimeline';
import { evidenceService } from '../services/evidenceService';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { Evidence, CustodyEvent, VerificationResponse } from '../types/evidence';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const EvidenceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [custody, setCustody] = useState<CustodyEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [verifyStoredResult, setVerifyStoredResult] = useState<VerificationResponse | null>(null);

  useEffect(() => {
    if (id) {
      const controller = new AbortController();
      Promise.all([
        evidenceService.getEvidenceById(id, { signal: controller.signal }),
        evidenceService.getCustodyChain(id, { signal: controller.signal })
          .then(res => (Array.isArray(res) ? res : res?.events) || [])
          .catch(() => [])
      ]).then(([evidenceData, custodyData]) => {
        setEvidence(evidenceData);
        setCustody(custodyData);
        setLoading(false);
      }).catch(err => {
        if (axios.isCancel(err)) return;
        console.error(err);
        setError('Failed to load evidence details');
        setLoading(false);
      });

      return () => controller.abort();
    }
  }, [id]);

  // Correcting the mistake in the useEffect above: the set_custody was a typo.
  // I will fix the lapped logic in the final Write call.

  if (loading) {
    return (
      <PageContainer title="Loading Evidence...">
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-security-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PageContainer>
    );
  }

  if (error || !evidence) {
    return (
      <PageContainer title="Error">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-white mb-2">Evidence Not Found</h2>
          <p className="text-gray-500">{error || 'The requested evidence record could not be located in the vault.'}</p>
        </div>
      </PageContainer>
    );
  }

  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await evidenceService.downloadEvidence(id!);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = evidence.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('An error occurred while downloading the evidence.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStored = async () => {
    setLoading(true);
    setVerifyStoredResult(null);
    try {
      const result = await evidenceService.verifyStoredIntegrity(id!);
      setVerifyStoredResult(result);
    } catch (err) {
      console.error(err);
      setVerifyStoredResult({
        verified: false,
        status: 'error',
        message: 'An error occurred while verifying stored integrity.',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyCustody = async () => {
    setLoading(true);
    try {
      const result = await evidenceService.verifyCustodyChain(id!);
      alert(result.valid
        ? `Custody chain verified successfully. ${result.events_checked} events checked.`
        : `Custody chain integrity verification failed: ${result.message}`
      );
    } catch (err) {
      console.error(err);
      alert('An error occurred while verifying the custody chain.');
    } finally {
      setLoading(false);
    }
  };

  const canReadCustody = hasPermission(user, 'evidence:custody:read');
  const canVerifyCustody = hasPermission(user, 'evidence:custody:verify');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'provenance', label: 'Provenance' },
    ...(canReadCustody ? [{ id: 'custody', label: 'Chain of Custody' }] : []),
    { id: 'crypto', label: 'Cryptographic Proof' },
    { id: 'blockchain', label: 'Blockchain' },
  ];

  return (
    <PageContainer title={`Evidence ${evidence.evidence_id}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <EvidenceStatusIndicator status={evidence.verification_status} />
          <EvidenceMetadata evidence={evidence} />
        </div>
        <div className="lg:col-span-2">
          <div className="flex gap-1 p-1 bg-security-gray-900 rounded-xl mb-6 border border-security-gray-700">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 py-2 text-xs font-medium rounded-lg transition-all',
                  activeTab === tab.id
                    ? 'bg-security-accent text-security-black'
                    : 'text-gray-400 hover:text-white hover:bg-security-gray-800'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="flex gap-3">
                  {hasPermission(user, 'evidence:read') && (
                    <button
                      onClick={handleDownload}
                      disabled={loading}
                      className="px-4 py-2 bg-security-accent text-security-black text-xs font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      Download Evidence
                    </button>
                  )}
                  {hasPermission(user, 'evidence:verify') && (
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleVerifyStored}
                        disabled={loading}
                        className="px-4 py-2 bg-security-gray-800 text-white text-xs font-bold rounded-lg hover:bg-security-gray-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Verifying...
                          </div>
                        ) : (
                          'Verify Stored Integrity'
                        )}
                      </button>

                      {verifyStoredResult && (
                        <div className={cn(
                          "p-3 rounded-lg border text-xs",
                          verifyStoredResult.verified
                            ? "bg-green-500/10 border-green-500/50 text-green-400"
                            : "bg-red-500/10 border-red-500/50 text-red-400"
                        )}>
                          <div className="flex items-center gap-2 font-bold mb-1">
                            {verifyStoredResult.verified ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {verifyStoredResult.verified ? 'Integrity Verified' : 'Verification Failed'}
                          </div>
                          <p className="opacity-90">{verifyStoredResult.message}</p>
                          {verifyStoredResult.status && (
                            <div className="mt-2 pt-2 border-t border-current/20 flex justify-between items-center">
                              <span className="text-[10px] uppercase opacity-70">Status:</span>
                              <span className="text-[10px] font-mono font-bold">{verifyStoredResult.status}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <CryptoDetails evidence={evidence} />
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Executive Summary</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    This evidence record was secured on {new Date(evidence.uploaded_at).toLocaleString()} and has undergone initial integrity verification.
                    The cryptographic hash has been stored in the secure vault.
                    Current forensic status is <span className={cn(
                      'font-bold',
                      evidence.verification_status === 'verified' ? 'text-security-accent' : 'text-red-500'
                    )}>{evidence.verification_status}</span>.
                  </p>
                </div>
              </div>
            )}
            {activeTab === 'provenance' && <ProvenanceTimeline />}
            {activeTab === 'custody' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Custody Timeline</h3>
                  {canVerifyCustody && (
                    <button
                      onClick={verifyCustody}
                      disabled={loading}
                      className="px-4 py-2 bg-security-accent text-security-black text-xs font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
                    >
                      Verify Chain
                    </button>
                  )}
                </div>
                <CustodyTimeline events={custody} />
              </div>
            )}
            {activeTab === 'crypto' && <CryptoDetails evidence={evidence} />}
            {activeTab === 'blockchain' && (
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-6">Blockchain Anchoring</h3>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-security-gray-800">
                    <span className="text-gray-500 text-sm">Storage Encryption</span>
                    <span className="text-security-accent text-sm font-bold uppercase">AES-256-GCM</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-security-gray-800">
                    <span className="text-gray-500 text-sm">Encryption Status</span>
                    <span className="text-white text-sm font-medium">Encrypted at Rest</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-security-gray-800">
                    <span className="text-gray-500 text-sm">Network</span>
                    <span className="text-white text-sm font-medium">Coming Soon</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-security-gray-800">
                    <span className="text-gray-500 text-sm">Transaction Hash</span>
                    <span className="text-white text-sm font-mono">Not yet anchored</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-security-gray-800">
                    <span className="text-gray-500 text-sm">Block Number</span>
                    <span className="text-white text-sm font-medium">N/A</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-security-gray-800">
                    <span className="text-gray-500 text-sm">Timestamp</span>
                    <span className="text-white text-sm font-medium">N/A</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default EvidenceDetails;
