import React from 'react';
import { CheckCircle2, Clock, ShieldAlert, Upload } from 'lucide-react';
import { cn } from '../../utils/cn.js';

const activity = [
  {
    event: 'Evidence Uploaded',
    time: '2 mins ago',
    desc: 'EV-2026-00133 secured',
    status: 'success',
    icon: Upload
  },
  {
    event: 'SHA-256 Generated',
    time: '5 mins ago',
    desc: 'Hash: a83f...91cd',
    status: 'success',
    icon: CheckCircle2
  },
  {
    event: 'ZK Proof Created',
    time: '12 mins ago',
    desc: 'Proof ZKP-00124 verified',
    status: 'success',
    icon: CheckCircle2
  },
  {
    event: 'Integrity Alert',
    time: '1 hour ago',
    desc: 'Mismatch in EV-2026-00127',
    status: 'error',
    icon: ShieldAlert
  },
  {
    event: 'Custody Transfer',
    time: '3 hours ago',
    desc: 'Investigator A → Analyst B',
    status: 'pending',
    icon: Clock
  },
];

export const ActivityTimeline = () => {
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-bold text-white mb-6">Security Activity</h3>
      <div className="relative space-y-6">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-security-gray-700"></div>
        {activity.map((item, i) => (
          <div key={i} className="relative pl-10 group">
            <div className={cn(
              'absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-security-black z-10 transition-colors',
              item.status === 'success' ? 'bg-security-accent' :
              item.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            )}></div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                  {item.event}
                </span>
                <span className="text-[10px] text-gray-500">{item.time}</span>
              </div>
              <p className="text-xs text-gray-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
