import React from 'react';
import { User, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export const CustodyTimeline = ({ events }) => {
  return (
    <div className="glass-card p-8">
      <h3 className="text-lg font-bold text-white mb-8">Forensic Chain of Custody</h3>
      <div className="space-y-6">
        {events.map((event, i) => (
          <div key={event.id} className="relative pl-8">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-security-gray-700"></div>
            <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-security-accent"></div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-security-black border border-security-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-security-gray-800 text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{event.actor}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-security-accent/10 text-security-accent font-bold uppercase">
                      {event.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{event.action}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div className="text-right">
                  <p className="text-xs text-gray-300 font-mono">{event.signature.substring(0, 12)}...</p>
                  <p className="text-[10px] text-gray-500">{event.timestamp}</p>
                </div>
                <ShieldCheck className="w-5 h-5 text-security-accent" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
