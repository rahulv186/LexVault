import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { EvidenceStatusIndicator } from '../components/evidence/EvidenceStatus.jsx';
import { EvidenceMetadata } from '../components/evidence/EvidenceMetadata.jsx';
import { CryptoDetails } from '../components/evidence/CryptoDetails.jsx';
import { ProvenanceTimeline } from '../components/evidence/ProvenanceTimeline.jsx';
import { CustodyTimeline } from '../components/evidence/CustodyTimeline.jsx';
import { evidenceService } from '../services/evidenceService.js';
import { custodyService } from '../services/custodyService.js';
import { cn } from '../utils/cn.js';

export const EvidenceDetails = () => {
  const { id } = useParams();
  const [evidence, setEvidence] = useState(null);
  const [custody, setCustody] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      const controller = new AbortController();
      Promise.all([
        evidenceService.getEvidenceById({ id, signal: controller.signal }),
        // Custody is still mock for this milestone, but we keep the call
        custodyService.getCustodyEvents(id).catch(() => [])
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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'provenance', label: 'Provenance' },
    { id: 'custody', label: 'Chain of Custody' },
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
            {activeTab === 'custody' && <CustodyTimeline events={custody} />}
            {activeTab === 'crypto' && <CryptoDetails evidence={evidence} />}
            {activeTab === 'blockchain' && (
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-6">Blockchain Anchoring</h3>
                <div className="space-y-4">
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
