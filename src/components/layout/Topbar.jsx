import React from 'react';
import { Search, Bell, User, Shield } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export const Topbar = ({ title }) => {
  return (
    <header className="h-16 bg-security-gray-900 border-b border-security-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search evidence, hashes, IDs..."
            className="bg-security-black border border-security-gray-700 rounded-full pl-10 pr-4 py-1.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-security-accent w-64 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-security-accent/10 border border-security-accent/20">
          <Shield className="w-3 h-3 text-security-accent" />
          <span className="text-[10px] font-bold text-security-accent uppercase tracking-wider">Encrypted Session</span>
        </div>

        <button className="p-2 rounded-full hover:bg-security-gray-800 text-gray-400 hover:text-white transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-security-gray-900"></span>
        </button>

        <div className="h-8 w-px bg-security-gray-700 mx-2"></div>

        <button className="flex items-center gap-3 hover:bg-security-gray-800 p-1 rounded-lg transition-colors">
          <div className="w-8 h-8 rounded-full bg-security-gray-700 flex items-center justify-center text-gray-400 overflow-hidden">
            <User className="w-5 h-5" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-medium text-white leading-none">Operator_A</p>
            <p className="text-[10px] text-gray-500 leading-none mt-1">Admin</p>
          </div>
        </button>
      </div>
    </header>
  );
};
