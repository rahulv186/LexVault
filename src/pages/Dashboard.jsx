import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { StatCard } from '../components/dashboard/StatCard.jsx';
import { RecentEvidence } from '../components/dashboard/RecentEvidence.jsx';
import { ActivityTimeline } from '../components/dashboard/ActivityTimeline.jsx';
import { Database, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { evidenceService } from '../services/evidenceService.js';

const Dashboard = () => {
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0, tampered: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    evidenceService.getStats({ signal: controller.signal })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        if (axios.isCancel(err)) return;
        console.error(err);
        setError('Failed to load dashboard statistics');
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <PageContainer title="Security Overview">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-6 animate-pulse h-32"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6 animate-pulse h-64"></div>
          <div className="lg:col-span-1 glass-card p-6 animate-pulse h-64"></div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Security Overview">
        <div className="glass-card p-6 text-center border-red-500">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-security-accent text-security-black rounded-lg font-bold"
          >
            Retry
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Security Overview">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Evidence"
          value={stats.total}
          icon={Database}
          color="text-blue-400"
          trend="Vault total records"
        />
        <StatCard
          label="Verified Evidence"
          value={stats.verified}
          icon={ShieldCheck}
          color="text-security-accent"
          trend="Integrity confirmed"
        />
        <StatCard
          label="Pending Verification"
          value={stats.pending}
          icon={Clock}
          color="text-yellow-400"
          trend="Awaiting verification"
        />
        <StatCard
          label="Integrity Alerts"
          value={stats.tampered}
          icon={AlertTriangle}
          color="text-red-400"
          trend="Tamper detected"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentEvidence />
        </div>
        <div className="lg:col-span-1">
          <ActivityTimeline />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <div className="glass-card p-4 flex flex-col gap-2">
          <span className="text-xs text-gray-500 uppercase font-bold">Blockchain Network</span>
          <span className="text-sm font-medium text-white">Sepolia Testnet (Planned)</span>
        </div>
        <div className="glass-card p-4 flex flex-col gap-2">
          <span className="text-xs text-gray-500 uppercase font-bold">IPFS Status</span>
          <span className="text-sm font-medium text-gray-400">Coming Soon</span>
        </div>
        <div className="glass-card p-4 flex flex-col gap-2">
          <span className="text-xs text-gray-500 uppercase font-bold">ZK Proof System</span>
          <span className="text-sm font-medium text-gray-400">Coming Soon</span>
        </div>
        <div className="glass-card p-4 flex flex-col gap-2">
          <span className="text-xs text-gray-500 uppercase font-bold">Vault Encryption</span>
          <span className="text-sm font-medium text-gray-400">Coming Soon</span>
        </div>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
