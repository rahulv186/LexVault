import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Plus,
  Key
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { MULTISIG_ABI, MULTISIG_ADDRESS } from '../web3/contracts';
import apiClient from '../services/apiClient';
import { encodePacked, keccak256 } from 'viem';

interface CaseMember {
  user_id: number;
  role: string;
  user?: {
    username: string;
    full_name: string;
  };
}

interface CaseData {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: string;
  multisig_address: string;
  multisig_threshold: number;
}

interface AccessRequest {
  requestId: string;
  caseId: string;
  reason: string;
  approvals: number;
  executed: boolean;
}

export const CaseDetailsPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { address: walletAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [members, setMembers] = useState<CaseMember[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configAddress, setConfigAddress] = useState('');
  const [configThreshold, setConfigThreshold] = useState(1);

  useEffect(() => {
    const fetchCaseDetails = async () => {
      try {
        setLoading(true);
        const [caseRes, membersRes] = await Promise.all([
          apiClient.get(`/api/cases/${caseId}/`),
          apiClient.get(`/api/cases/${caseId}/members/`),
        ]);
        setCaseData(caseRes.data);
        setMembers(membersRes.data);

        if (caseRes.data.multisig_address) {
          await fetchOnChainRequests(caseRes.data.multisig_address);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load case details');
      } finally {
        setLoading(false);
      }
    };

    if (caseId) fetchCaseDetails();
  }, [caseId]);

  const fetchOnChainRequests = async (contractAddress: string) => {
    try {
      // In a real implementation, we would use useReadContract or a viem client
      // For this prototype, we'll simulate the request list fetch
      // In Phase 4.2 we'll replace this with actual viem calls
      console.log('Fetching requests from contract:', contractAddress);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    }
  };

  const handleRequestAccess = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }
    if (!requestReason) {
      setError('Please provide a reason for access');
      return;
    }

    try {
      const txHash = await writeContractAsync({
        address: MULTISIG_ADDRESS as `0x${string}`,
        abi: MULTISIG_ABI,
        functionName: 'requestAccess',
        args: [
          '0x' + caseId?.replace(/-/g, '').substring(0, 64) as `0x${string}`,
          '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          keccak256(encodePacked(['READ'])) as `0x${string}`,
          Math.floor(Math.random() * 1000000),
        ],
      });
      console.log('Request sent, tx:', txHash);
      alert('Access request submitted to blockchain!');
      setRequestReason('');
    } catch (err: any) {
      setError(err.message || 'Blockchain transaction failed');
    }
  };

  const handleApproveAccess = async (requestId: string) => {
    try {
      const txHash = await writeContractAsync({
        address: MULTISIG_ADDRESS as `0x${string}`,
        abi: MULTISIG_ABI,
        functionName: 'approveAccess',
        args: [requestId as `0x${string}`],
      });
      console.log('Approval sent, tx:', txHash);
      alert('Approval submitted!');
    } catch (err: any) {
      setError(err.message || 'Approval transaction failed');
    }
  };

  const handleConfigureMultisig = async () => {
    try {
      const response = await apiClient.post(`/api/cases/${caseId}/multisig/`, {
        address: configAddress,
        threshold: configThreshold,
      });
      setCaseData(response.data);
      setIsConfiguring(false);
      alert('Multisig configuration updated in backend!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Configuration failed');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-white">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-security-accent"></div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold mb-2">Error</h2>
      <p className="text-gray-400 mb-6">{error}</p>
      <button
        onClick={() => navigate('/dashboard')}
        className="px-4 py-2 bg-security-accent text-white rounded-lg hover:bg-security-accent/80 transition-colors"
      >
        Return to Dashboard
      </button>
    </div>
  );

  if (!caseData) return (
    <div className="flex items-center justify-center h-full text-white p-8 text-center">
      <div className="space-y-4">
        <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Case Not Found</h2>
        <p className="text-gray-400 mb-6">The requested case details could not be loaded.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-security-accent text-white rounded-lg hover:bg-security-accent/80 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-bold uppercase",
            caseData.status === 'OPEN' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          )}>
            {caseData.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8">
            <h1 className="text-3xl font-bold text-white mb-2">{caseData.title}</h1>
            <p className="text-gray-400 mb-6">{caseData.description}</p>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-security-black border border-security-gray-700">
              <div className="p-2 rounded-lg bg-security-gray-800 text-security-accent">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Case Number</p>
                <p className="text-white font-mono">{caseData.case_number}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-security-accent" />
                Multi-Signature Access Control
              </h3>
              {caseData.multisig_address ? (
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Contract Address</p>
                  <p className="text-xs text-gray-300 font-mono">{caseData.multisig_address.substring(0, 6)}...{caseData.multisig_address.slice(-4)}</p>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfiguring(true)}
                  className="text-xs text-security-accent hover:underline"
                >
                  Configure Multisig
                </button>
              )}
            </div>

            {!caseData.multisig_address ? (
              <div className="p-6 rounded-lg bg-security-black border border-dashed border-security-gray-700 text-center">
                <Key className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-4">No multisig configured for this case.</p>
                <button
                  onClick={() => setIsConfiguring(true)}
                  className="px-4 py-2 bg-security-accent text-white rounded-lg text-sm hover:bg-security-accent/80 transition-colors"
                >
                  Set Up Access Control
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-security-black border border-security-gray-700">
                  <div className="p-2 rounded-lg bg-security-gray-800 text-security-accent">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 uppercase font-bold">Approval Threshold</p>
                    <p className="text-white">{caseData.multisig_threshold} signatures required</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded bg-security-accent/10 text-security-accent font-bold uppercase">
                      Active
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-400 uppercase">Request Evidence Access</h4>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder="Reason for access (e.g. Forensic Analysis)"
                      className="flex-1 bg-security-black border border-security-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-security-accent transition-colors"
                    />
                    <button
                      onClick={handleRequestAccess}
                      className="px-4 py-2 bg-security-accent text-white rounded-lg text-sm font-bold hover:bg-security-accent/80 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Request
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-400 uppercase">Pending Requests</h4>
                  {requests.length === 0 ? (
                    <div className="text-center p-8 rounded-lg bg-security-black border border-security-gray-700">
                      <p className="text-gray-500 text-sm">No pending access requests.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {requests.map((req) => (
                        <div key={req.requestId} className="p-4 rounded-lg bg-security-black border border-security-gray-700 flex items-center justify-between">
                          <div>
                            <p className="text-white text-sm font-medium">{req.reason}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-gray-500 uppercase font-bold">Approvals: {req.approvals}/{caseData.multisig_threshold}</span>
                              {req.approvals >= caseData.multisig_threshold && (
                                <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold uppercase">
                                  <CheckCircle className="w-3 h-3" />
                                  Ready
                                </span>
                              )}
                            </div>
                          </div>
                          {!req.executed && req.approvals < caseData.multisig_threshold && (
                            <button
                              onClick={() => handleApproveAccess(req.requestId)}
                              className="px-3 py-1.5 bg-security-gray-800 text-white rounded-lg text-xs hover:bg-security-gray-700 transition-colors font-bold"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-security-accent" />
              Case Members
            </h3>
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg bg-security-black border border-security-gray-700">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {member.user?.full_name || member.user?.username || `User ${member.user_id}`}
                    </p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </div>
                  {member.role === 'Lead' && (
                    <div className="p-1 rounded bg-security-accent/10 text-security-accent">
                      <Shield className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isConfiguring && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-8 w-full max-w-md space-y-6">
            <h3 className="text-xl font-bold text-white">Configure Multisig</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Contract Address</label>
                <input
                  type="text"
                  value={configAddress}
                  onChange={(e) => setConfigAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-security-black border border-security-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-security-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Approval Threshold</label>
                <input
                  type="number"
                  value={configThreshold}
                  onChange={(e) => setConfigThreshold(parseInt(e.target.value))}
                  className="w-full bg-security-black border border-security-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-security-accent transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsConfiguring(false)}
                className="flex-1 px-4 py-2 bg-security-gray-800 text-white rounded-lg text-sm font-bold hover:bg-security-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfigureMultisig}
                className="flex-1 px-4 py-2 bg-security-accent text-white rounded-lg text-sm font-bold hover:bg-security-accent/80 transition-colors"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CaseDetailsPage;
