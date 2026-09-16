import apiClient from './apiClient';

export const userService = {
  async getUsers({ signal = null } = {}) {
    const response = await apiClient.get('/api/users/', { signal });
    return response.data;
  },

  async getRoles({ signal = null } = {}) {
    const response = await apiClient.get('/api/users/roles/', { signal });
    return response.data;
  },

  async updateUserRole(userId, roleName) {
    const response = await apiClient.patch(`/api/users/${userId}/role`, {
      role_name: roleName,
    });
    return response.data;
  },

  async updateUserStatus(userId, isActive) {
    const response = await apiClient.patch(`/api/users/${userId}/status`, {
      is_active: isActive,
    });
    return response.data;
  },
};
