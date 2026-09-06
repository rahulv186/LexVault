import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  UploadCloud,
  Search,
  History,
  Zap,
  Boxes,
  Settings,
  Lock,
  Database,
  Activity
} from 'lucide-react';
import { cn } from '../../utils/cn.js';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Evidence Vault', path: '/evidence', icon: ShieldCheck },
  { name: 'Upload Evidence', path: '/upload', icon: UploadCloud },
  { name: 'Verify Evidence', path: '/verify', icon: Search },
  { name: 'Chain of Custody', path: '/custody', icon: History },
  { name: 'ZK Proofs', path: '/zk-proofs', icon: Zap },
  { name: 'Architecture', path: '/architecture', icon: Boxes },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-security-gray-900 border-r border-security-gray-700 flex flex-col h-screen">
      <div className="p-6 flex items-center gap-3 border-b border-security-gray-700">
        <div className="w-8 h-8 bg-security-accent rounded-lg flex items-center justify-center">
          <Lock className="w-5 h-5 text-security-black" />
        </div>
        <span className="text-xl font-bold tracking-tighter text-white">LEXVAULT</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-security-accent text-security-black font-medium'
                  : 'text-gray-400 hover:bg-security-gray-800 hover:text-white'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive ? 'text-security-black' : 'text-gray-400 group-hover:text-white')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-security-gray-700 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 px-2">
            <Activity className="w-3 h-3" />
            <span>SYSTEM STATUS</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between px-2 py-1.5 rounded bg-security-black border border-security-gray-700">
              <span className="text-xs text-gray-400">Network</span>
              <span className="text-xs text-security-accent font-medium">Sepolia</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 rounded bg-security-black border border-security-gray-700">
              <span className="text-xs text-gray-400">Vault</span>
              <span className="text-xs text-security-accent font-medium">Active</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 rounded bg-security-black border border-security-gray-700">
              <span className="text-xs text-gray-400">Storage</span>
              <span className="text-xs text-security-accent font-medium">IPFS</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-security-gray-800 border border-security-gray-700">
          <div className="w-8 h-8 rounded-full bg-security-accent/20 flex items-center justify-center border border-security-accent/30">
            <Database className="w-4 h-4 text-security-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">Forensic_User_01</p>
            <p className="text-[10px] text-gray-500 truncate">Security Clearance: L3</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
