import apiClient from './apiClient';
import { CustodyEvent } from '../types/evidence';

interface CustodyService {
  getCustodyEvents(evidenceId?: string): Promise<CustodyEvent[]>;
}

export const custodyService: CustodyService = {
  async getCustodyEvents(evidenceId?: string) {
    if (evidenceId) {
      const response = await apiClient.get(`/api/evidence/${evidenceId}/custody/`);
      return response.data.events || [];
    }
    // Global custody events endpoint - assuming it exists or will exist
    const response = await apiClient.get('/api/custody/events/');
    return response.data || [];
  }
};
