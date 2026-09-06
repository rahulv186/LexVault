import React from 'react';
import { cn } from '../../utils/cn.js';

export const StatCard = ({ label, value, icon: Icon, color, trend }) => {
  return (
    <div className="glass-card p-6 group hover:border-security-accent/50 transition-all duration-300 cursor-default">
      <div className="flex justify-between items-start mb-4">
        <div className={cn('p-2 rounded-lg bg-security-black border border-security-gray-700', color)}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-medium text-gray-500 px-2 py-1 rounded-full bg-security-black border border-security-gray-700">
          Real-time
        </span>
      </div>
      <div>
        <p className="text-sm text-gray-400 font-medium mb-1">{label}</p>
        <h3 className="text-3xl font-bold text-white mb-2">{value}</h3>
        <p className="text-xs text-gray-500">{trend}</p>
      </div>
    </div>
  );
};
