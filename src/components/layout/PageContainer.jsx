import React from 'react';
import { cn } from '../../utils/cn.js';

export const PageContainer = ({ children, title, className }) => {
  return (
    <div className={cn('flex-1 p-6 overflow-auto h-full', className)}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
            <p className="text-gray-400 mt-1">Secure Forensic Evidence Management</p>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
};
