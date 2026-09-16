import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { ProtectedRoute, RequirePermission } from './components/ProtectedRoute';

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

const App = () => {
  return (
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
                    <Route path="/evidence" element={<RequirePermission permission="evidence:read"><EvidenceVault /></RequirePermission>} />
                    <Route path="/evidence/:id" element={<RequirePermission permission="evidence:read"><EvidenceDetails /></RequirePermission>} />
                    <Route path="/upload" element={<RequirePermission permission="evidence:create"><UploadEvidence /></RequirePermission>} />
                    <Route path="/verify" element={<RequirePermission permission="evidence:verify"><VerifyEvidence /></RequirePermission>} />
                    <Route path="/custody" element={<RequirePermission permission="evidence:custody:read"><ChainOfCustody /></RequirePermission>} />
                    <Route path="/zk-proofs" element={<RequirePermission permission="zk:verify"><ZKProofs /></RequirePermission>} />
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
  );
};

export default App;
