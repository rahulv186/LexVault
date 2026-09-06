import { mockProofs } from '../data/mockProofs.js';

export const zkService = {
  async getAllProofs() {
    // TODO: Replace with axios.get('/api/zk-proofs')
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockProofs), 500);
    });
  },

  async generateProof(evidenceId) {
    // TODO: Replace with axios.post('/api/zk-proofs/generate', { evidenceId })
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `ZKP-2026-0${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          evidenceId,
          circuit: 'EvidenceIntegrityCircuit',
          statement: 'The investigator possesses evidence matching the committed hash.',
          publicInput: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          status: 'VALID',
          generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          verifierStatus: 'Verified',
        });
      }, 2000);
    });
  },

  async verifyProof(proofId) {
    // TODO: Replace with axios.post('/api/zk-proofs/verify', { proofId })
    return new Promise((resolve) => {
      setTimeout(() => {
        const proof = mockProofs.find(p => p.id === proofId);
        resolve({
          success: proof?.status === 'VALID',
          details: {
            circuit: proof?.circuit || 'Unknown',
            status: proof?.status || 'INVALID',
          }
        });
      }, 1000);
    });
  }
};
