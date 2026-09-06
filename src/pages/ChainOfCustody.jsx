import React, { useEffect, useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { CustodyTimeline } from '../components/evidence/CustodyTimeline.jsx';
import { custodyService } from '../services/custodyService.js';
import { Search } from 'lucide-react';

export const ChainOfCustody = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    custodyService.getCustodyEvents().then(data => {
      setEvents(data);
      setLoading(false);
    });
  }, []);

  const filteredEvents = events.filter(e =>
    e.evidenceId.toLowerCase().includes(search.toLowerCase()) ||
    e.actor.toLowerCase().includes(search.toLowerCase()) ||
    e.action.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <PageContainer title="Chain of Custody">
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-security-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Chain of Custody">
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Filter by Evidence ID, Actor or Action..."
            className="w-full bg-security-gray-900 border border-security-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-security-accent transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <CustodyTimeline events={filteredEvents} />
    </PageContainer>
  );
};

export default ChainOfCustody;
