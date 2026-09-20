import apiClient from './apiClient';
import {
  Evidence,
  EvidenceListResponse,
  VerificationResponse
} from '../types/evidence';

interface EvidenceService {
  getStats(options?: { signal?: AbortSignal }): Promise<any>;
  getAllEvidence(options?: {
    page?: number;
    pageSize?: number;
    status?: string;
    type?: string;
    search?: string;
    signal?: AbortSignal;
  }): Promise<EvidenceListResponse>;
  getEvidenceById(id: string, options?: { signal?: AbortSignal }): Promise<Evidence>;
  uploadEvidence(options?: { file: File; signal?: AbortSignal }): Promise<Evidence>;
  downloadEvidence(id: string, options?: { signal?: AbortSignal }): Promise<Blob>;
  verifyStoredIntegrity(id: string, options?: { signal?: AbortSignal }): Promise<VerificationResponse>;
  getCustodyChain(id: string, options?: { signal?: AbortSignal }): Promise<any>;
  verifyCustodyChain(id: string, options?: { signal?: AbortSignal }): Promise<any>;
  verifyEvidence(options: { id: string; file: File; signal?: AbortSignal }): Promise<VerificationResponse>;
}

export const evidenceService: EvidenceService = {
  async getStats({ signal = undefined } = {}) {
    const response = await apiClient.get('/api/evidence/stats/', { signal });
    return response.data;
  },

  async getAllEvidence({
    page = 1,
    pageSize = 20,
    status = '',
    type = '',
    search = '',
    signal = undefined
  } = {}) {
    const response = await apiClient.get('/api/evidence/', {
      params: { page, page_size: pageSize, status, type, search },
      signal,
    });
    return response.data;
  },

  async getEvidenceById(id, { signal = undefined } = {}) {
    const response = await apiClient.get(`/api/evidence/${id}/`, { signal });
    return response.data;
  },

  async uploadEvidence(options?: { file: File; signal?: AbortSignal }) {
    const { file, signal = undefined } = options || {};
    if (!file) throw new Error("File is required for upload");
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/api/evidence/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal,
    });
    return response.data;
  },

  async downloadEvidence(id, { signal = undefined } = {}) {
    const response = await apiClient.get(`/api/evidence/${id}/download`, {
      responseType: 'blob',
      signal,
    });
    return response.data;
  },

  async verifyStoredIntegrity(id, { signal = undefined } = {}) {
    const response = await apiClient.post(`/api/evidence/${id}/verify-stored/`, {}, { signal });
    return response.data;
  },

  async getCustodyChain(id, { signal = undefined } = {}) {
    const response = await apiClient.get(`/api/evidence/${id}/custody/`, { signal });
    return response.data;
  },

  async verifyCustodyChain(id, { signal = undefined } = {}) {
    const response = await apiClient.post(`/api/evidence/${id}/custody/verify/`, {}, { signal });
    return response.data;
  },

  async verifyEvidence(options?: { id: string; file: File; signal?: AbortSignal }) {
    const { id, file, signal = undefined } = options || {};
    if (!id || !file) throw new Error("Both evidence ID and file are required for verification");
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/api/evidence/${encodeURIComponent(id)}/verify/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal,
    });
    return response.data;
  }
};
