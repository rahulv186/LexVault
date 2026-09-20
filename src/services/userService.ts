import apiClient from './apiClient';
import { User, Role } from '../types/user';

interface UserService {
  getUsers(options?: { signal?: AbortSignal }): Promise<User[]>;
  getRoles(options?: { signal?: AbortSignal }): Promise<Role[]>;
  updateUserRole(userId: number, roleName: string): Promise<any>;
  updateUserStatus(userId: number, isActive: boolean): Promise<any>;
}

export const userService: UserService = {
  async getUsers({ signal = undefined } = {}) {
    const response = await apiClient.get('/api/users/', { signal });
    return response.data;
  },

  async getRoles({ signal = undefined } = {}) {
    const response = await apiClient.get('/api/users/roles/', { signal });
    return response.data;
  },

  async updateUserRole(userId: number, roleName: string) {
    const response = await apiClient.patch(`/api/users/${userId}/role`, {
      role_name: roleName,
    });
    return response.data;
  },

  async updateUserStatus(userId: number, isActive: boolean) {
    const response = await apiClient.patch(`/api/users/${userId}/status`, {
      is_active: isActive,
    });
    return response.data;
  },
};
