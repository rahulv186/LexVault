import { mockCustody } from '../data/mockCustody.js';

export const custodyService = {
  async getCustodyEvents(evidenceId) {
    // TODO: Replace with axios.get('/api/custody')
    return new Promise((resolve) => {
      setTimeout(() => {
        if (evidenceId) {
          resolve(mockCustody.filter(e => e.evidenceId === evidenceId));
        } else {
          resolve(mockCustody);
        }
      }, 500);
    });
  }
};
