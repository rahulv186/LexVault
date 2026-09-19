import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Topbar = ({ title = 'LexVault Security' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-security-gray-900 border-b border-security-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-200 tracking-wide">{title}</h2>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-security-accent/10 border border-security-accent/20">
          <Shield className="w-3 h-3 text-security-accent" />
          <span className="text-[10px] font-bold text-security-accent uppercase tracking-wider">Encrypted Session</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-security-black/50 border border-security-gray-700/60">
          <div className="w-7 h-7 rounded-full bg-security-gray-800 border border-security-gray-600 flex items-center justify-center text-gray-300">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-medium text-white leading-tight">{user?.username || 'User'}</p>
            <p className="text-[10px] text-gray-400 leading-tight capitalize">{user?.role_name || 'Guest'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-red-400 bg-security-black/40 hover:bg-red-500/10 border border-security-gray-700 hover:border-red-500/30 rounded-lg transition-all duration-150"
          title="Sign out of LexVault"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
