import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { ProtectedRoute, RequirePermission } from './components/ProtectedRoute';
import { WagmiProvider } from 'wagmi';
import { ConnectKitProvider } from 'connectkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './web3/config';

import Dashboard from './pages/Dashboard';
import EvidenceVault from './pages/EvidenceVault';
import EvidenceDetails from './pages/EvidenceDetails';
import UploadEvidence from './pages/UploadEvidence';
import VerifyEvidence from './pages/VerifyEvidence';
import ChainOfCustody from './pages/ChainOfCustody';
import ZKProofs from './pages/ZKProofs';
import Architecture from './pages/Architecture';
import Settings from './pages/Settings';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/Register';
import AdminUsers from './pages/AdminUsers';
import CaseDetailsPage from './pages/CaseDetailsPage';
import CaseListPage from './pages/CaseListPage';

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="flex h-screen w-full bg-security-black text-gray-100 overflow-hidden">
                    <Sidebar />
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <Topbar title="LexVault Security" />
                      <div className="flex-1 overflow-auto">
                        <Routes>
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/cases" element={<CaseListPage />} />
                          <Route path="/evidence" element={<RequirePermission permission="evidence:read"><EvidenceVault /></RequirePermission>} />
                          <Route path="/evidence/:id" element={<RequirePermission permission="evidence:read"><EvidenceDetails /></RequirePermission>} />
                          <Route path="/upload" element={<RequirePermission permission="evidence:create"><UploadEvidence /></RequirePermission>} />
                          <Route path="/verify" element={<RequirePermission permission="evidence:verify"><VerifyEvidence /></RequirePermission>} />
                          <Route path="/custody" element={<RequirePermission permission="evidence:custody:read"><ChainOfCustody /></RequirePermission>} />
                          <Route path="/zk-proofs" element={<RequirePermission permission="zk:verify"><ZKProofs /></RequirePermission>} />
                          <Route path="/cases/:caseId" element={<CaseDetailsPage />} />
                          <Route path="/architecture" element={<Architecture />} />
                          <Route path="/admin/users" element={<RequirePermission permission="users:manage"><AdminUsers /></RequirePermission>} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </div>
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;
