import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const evidenceService = {
  async getStats({ signal } = {}) {
    const response = await apiClient.get('/api/evidence/stats/', { signal });
    return response.data;
  },

  async getAllEvidence({
    page = 1,
    pageSize = 20,
    status = '',
    type = '',
    search = '',
    signal = null
  } = {}) {
    const response = await apiClient.get('/api/evidence/', {
      params: { page, page_size: pageSize, status, type, search },
      signal,
    });
    return response.data; // returns { total, page, page_size, items }
  },

  async getEvidenceById(id, { signal = null } = {}) {
    const response = await apiClient.get(`/api/evidence/${id}/`, { signal });
    return response.data;
  },

  async uploadEvidence({ file, uploadedBy = 'Forensic_User_01', signal = null } = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploaded_by', uploadedBy);

    const response = await apiClient.post('/api/evidence/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal,
    });
    return response.data;
  },

  async getCustodyChain(id, { signal = null } = {}) {
    const response = await apiClient.get(`/api/evidence/${id}/custody/`, { signal });
    return response.data;
  },

  async verifyCustodyChain(id, { signal = null } = {}) {
    const response = await apiClient.post(`/api/evidence/${id}/custody/verify/`, {}, { signal });
    return response.data;
  },

  async verifyEvidence(id, { file, signal } = {}) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/api/evidence/${id}/verify/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal,
    });
    return response.data;
  }
};
