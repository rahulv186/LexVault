import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ChevronRight, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: string;
}

interface CaseCreatePayload {
  title: string;
  description: string;
}

export const CaseListPage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createPayload, setCreatePayload] = useState<CaseCreatePayload>({
    title: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await apiClient.get('/api/cases/');
        setCases(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch cases');
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/cases/', createPayload);
      const newCase = response.data;
      setCases([...cases, newCase]);
      setIsCreating(false);
      navigate(`/cases/${newCase.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create case');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-white">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-security-accent"></div>
    </div>
  );

  if (error && !isCreating) return (
    <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center">
      <p className="text-gray-400 mb-4">{error}</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-security-accent rounded-lg">Retry</button>
    </div>
  );

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Case Management</h1>
          <p className="text-gray-400">Manage and monitor forensic cases</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-security-accent text-white rounded-lg hover:bg-security-accent/80 transition-colors font-bold"
        >
          <Plus className="w-4 h-4" />
          New Case
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-8 w-full max-w-md space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Create New Case</h3>
              <button onClick={() => setIsCreating(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Case Title</label>
                <input
                  type="text"
                  required
                  value={createPayload.title}
                  onChange={(e) => setCreatePayload({ ...createPayload, title: e.target.value })}
                  placeholder="Enter a descriptive title"
                  className="w-full bg-security-black border border-security-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-security-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Description</label>
                <textarea
                  value={createPayload.description}
                  onChange={(e) => setCreatePayload({ ...createPayload, description: e.target.value })}
                  placeholder="Describe the case objectives and scope..."
                  className="w-full bg-security-black border border-security-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-security-accent transition-colors h-32 resize-none"
                />
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-xs">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-2 bg-security-gray-800 text-white rounded-lg text-sm font-bold hover:bg-security-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-security-accent text-security-black rounded-lg text-sm font-bold hover:bg-security-accent/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cases.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/cases/${c.id}`)}
            className="glass-card p-6 cursor-pointer hover:border-security-accent transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-security-gray-800 text-security-accent">
                <Shield className="w-6 h-6" />
              </div>
              <span className={cn(
                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                c.status === 'OPEN' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              )}>
                {c.status}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-security-accent transition-colors">{c.title}</h3>
            <p className="text-xs text-gray-500 font-mono mb-4">{c.case_number}</p>
            <p className="text-sm text-gray-400 line-clamp-2 mb-6">{c.description || 'No description provided'}</p>
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 group-hover:text-white transition-colors">
              <span>VIEW DETAILS</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default CaseListPage;
