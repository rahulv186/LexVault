import apiClient from './apiClient';

export const zkService = {
  async getAllProofs() {
    const response = await apiClient.get('/api/zk/proofs/');
    return response.data;
  },

  async generateProof(evidenceId) {
    const response = await apiClient.post('/api/zk/proofs/', {
      evidence_id: evidenceId,
    });
    return response.data;
  },

  async verifyProof(proofId, overrides = {}) {
    const response = await apiClient.post(`/api/zk/proofs/${encodeURIComponent(proofId)}/verify/`, overrides);
    return response.data;
  }
};
