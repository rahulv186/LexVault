import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export const AccessDenied: React.FC = () => (
  <div className="flex min-h-full items-center justify-center bg-security-black p-8">
    <div className="glass-card max-w-md p-8 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <p className="mb-2 text-sm font-bold uppercase tracking-widest text-red-400">403</p>
      <h2 className="mb-3 text-2xl font-bold text-white">Access Denied</h2>
      <p className="mb-6 text-sm text-gray-500">
        You do not have permission to access this resource.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center justify-center rounded-lg bg-security-accent px-5 py-2 text-sm font-bold text-security-black transition-colors hover:bg-opacity-90"
      >
        Return to Dashboard
      </Link>
    </div>
  </div>
);

export default AccessDenied;
