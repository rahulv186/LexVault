import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { evidenceService } from '../services/evidenceService.js';
import { cn } from '../utils/cn.js';

export const EvidenceVault = () => {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const fetchEvidence = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const status = statusFilter === 'All' ? '' : statusFilter.toLowerCase();
      const type = typeFilter === 'All' ? '' : typeFilter;
      const data = await evidenceService.getAllEvidence({
        page: 1,
        pageSize: 100,
        status,
        type,
        search,
        signal
      });
      setEvidence(data.items || []);
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error(err);
      setError('Failed to fetch evidence records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const delayDebounceFn = setTimeout(() => {
      fetchEvidence(controller.signal);
    }, 300);

    return () => {
      clearTimeout(delayDebounceFn);
      controller.abort();
    };
  }, [search, statusFilter, typeFilter]);

  if (loading) {
    return (
      <PageContainer title="Evidence Vault">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-16 bg-security-gray-800 animate-pulse rounded-lg w-full"></div>
          ))}
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Evidence Vault">
        <div className="glass-card p-8 text-center border-red-500">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchEvidence}
            className="mt-4 px-4 py-2 bg-security-accent text-security-black rounded-lg font-bold"
          >
            Retry
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Evidence Vault">
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Filter by ID, filename or uploader..."
            className="w-full bg-security-gray-900 border border-security-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-security-accent transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <select
            className="bg-security-gray-900 border border-security-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-security-accent"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="tampered">Tampered</option>
            <option value="archived">Archived</option>
          </select>
          <select
            className="bg-security-gray-900 border border-security-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-security-accent"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Disk Image">Disk Image</option>
            <option value="Memory Dump">Memory Dump</option>
            <option value="Network Capture">Network Capture</option>
            <option value="Document">Document</option>
            <option value="Image">Image</option>
            <option value="Video">Video</option>
            <option value="Log File">Log File</option>
          </select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-security-gray-800/50 text-gray-400 border-b border-security-gray-700">
              <tr>
                <th className="px-6 py-4 font-medium">Evidence ID</th>
                <th className="px-6 py-4 font-medium">File</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Uploaded By</th>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-security-gray-800">
              {evidence.length > 0 ? (
                evidence.map((item) => (
                  <tr key={item.id} className="hover:bg-security-gray-800/30 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-gray-300">{item.evidence_id}</td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{item.original_filename}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{item.mime_type}</td>
                    <td className="px-6 py-4 text-gray-400">{item.uploaded_by}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {// Format the timestamp
                      new Date(item.uploaded_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                        item.verification_status === 'verified' ? 'bg-security-accent/10 text-security-accent' :
                        item.verification_status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-red-500/10 text-red-500'
                      )}>
                        {item.verification_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/evidence/${item.evidence_id}`}
                        className="p-2 rounded-lg hover:bg-security-gray-700 text-gray-400 hover:text-white transition-colors inline-block"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No evidence records found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
};

export default EvidenceVault;
