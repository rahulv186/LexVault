import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { evidenceService } from '../../services/evidenceService.js';
import { cn } from '../../utils/cn.js';

export const RecentEvidence = () => {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    evidenceService.getAllEvidence({
      page: 1,
      pageSize: 5,
      signal: controller.signal
    }).then(data => {
      // API returns { total, page, page_size, items }
      setEvidence(data.items || []);
      setLoading(false);
    }).catch(err => {
      if (axios.isCancel(err)) return;
      console.error(err);
      setError('Failed to load recent evidence');
      setLoading(false);
    });

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-4">Recent Evidence</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-security-gray-800 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">Recent Evidence</h3>
        <Link to="/evidence" className="text-xs text-security-accent hover:underline">View all evidence</Link>
      </div>
      {evidence.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-sm">
          No evidence records found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-security-gray-700">
                <th className="pb-3 font-medium">Evidence ID</th>
                <th className="pb-3 font-medium">File</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Blockchain</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-security-gray-800">
              {evidence.map((item) => (
                <tr key={item.id} className="group hover:bg-security-gray-800/30 transition-colors">
                  <td className="py-4 font-mono text-xs text-gray-300">{item.evidence_id}</td>
                  <td className="py-4">
                    <div className="flex flex-col">
                      <span className="text-white font-medium truncate max-w-[150px]">{item.original_filename}</span>
                      <span className="text-[10px] text-gray-500">{item.mime_type}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                      item.verification_status === 'Verified' ? 'bg-security-accent/10 text-security-accent' :
                      item.verification_status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-red-500/10 text-red-500'
                    )}>
                      {item.verification_status}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className="text-xs text-gray-400">Coming Soon</span>
                  </td>
                  <td className="py-4 text-right">
                    <Link
                      to={`/evidence/${item.evidence_id}`}
                      className="p-2 rounded-lg hover:bg-security-gray-700 text-gray-400 hover:text-white transition-colors inline-block"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
