import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';

import Dashboard from './pages/Dashboard';
import EvidenceVault from './pages/EvidenceVault';
import EvidenceDetails from './pages/EvidenceDetails';
import UploadEvidence from './pages/UploadEvidence';
import VerifyEvidence from './pages/VerifyEvidence';
import ChainOfCustody from './pages/ChainOfCustody';
import ZKProofs from './pages/ZKProofs';
import Architecture from './pages/Architecture';
import Settings from './pages/Settings';

const App = () => {
  return (
    <div className="flex h-screen w-full bg-security-black text-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="LexVault Security" />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/evidence" element={<EvidenceVault />} />
            <Route path="/evidence/:id" element={<EvidenceDetails />} />
            <Route path="/upload" element={<UploadEvidence />} />
            <Route path="/verify" element={<VerifyEvidence />} />
            <Route path="/custody" element={<ChainOfCustody />} />
            <Route path="/zk-proofs" element={<ZKProofs />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default App;
