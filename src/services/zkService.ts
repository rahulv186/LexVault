import apiClient from './apiClient';
import { ZKProof, ZKVerificationResponse } from '../types/zk';

interface ZKService {
  getAllProofs(): Promise<ZKProof[]>;
  generateProof(evidenceId: string): Promise<ZKProof>;
  verifyProof(proofId: string, overrides?: Record<string, any>): Promise<ZKVerificationResponse>;
}

export const zkService: ZKService = {
  async getAllProofs() {
    const response = await apiClient.get('/api/zk/proofs/');
    return response.data;
  },

  async generateProof(evidenceId: string) {
    const response = await apiClient.post('/api/zk/proofs/', {
      evidence_id: evidenceId,
    });
    return response.data;
  },

  async verifyProof(proofId: string, overrides = {}) {
    const response = await apiClient.post(`/api/zk/proofs/${encodeURIComponent(proofId)}/verify/`, overrides);
    return response.data;
  }
};
