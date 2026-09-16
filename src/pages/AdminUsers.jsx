import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, ShieldCheck, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { userService } from '../services/userService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { cn } from '../utils/cn.js';

export const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState(null);
  const [error, setError] = useState(null);

  const loadUsers = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [userData, roleData] = await Promise.all([
        userService.getUsers({ signal }),
        userService.getRoles({ signal }),
      ]);
      setUsers(userData);
      setRoles(roleData);
    } catch (err) {
      if (axios.isCancel(err)) return;
      setError(err.response?.data?.detail || 'Failed to load user management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadUsers(controller.signal);
    return () => controller.abort();
  }, []);

  const replaceUser = (updatedUser) => {
    setUsers((items) => items.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
  };

  const handleRoleChange = async (targetUser, roleName) => {
    setSavingUserId(targetUser.id);
    setError(null);
    try {
      const updatedUser = await userService.updateUserRole(targetUser.id, roleName);
      replaceUser(updatedUser);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update role');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleStatusChange = async (targetUser) => {
    setSavingUserId(targetUser.id);
    setError(null);
    try {
      const updatedUser = await userService.updateUserStatus(targetUser.id, !targetUser.is_active);
      replaceUser(updatedUser);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update account status');
    } finally {
      setSavingUserId(null);
    }
  };

  if (loading) {
    return (
      <PageContainer title="User Management">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-lg bg-security-gray-800" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="User Management">
      <div className="mb-6 flex items-center gap-3 text-gray-400">
        <Users className="h-5 w-5 text-security-accent" />
        <span className="text-sm">{users.length} accounts registered</span>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-security-gray-700 bg-security-gray-800/50 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Permissions</th>
                <th className="px-6 py-4 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-security-gray-800">
              {users.map((account) => {
                const isSelf = account.id === currentUser?.id;
                const isSaving = savingUserId === account.id;
                return (
                  <tr key={account.id} className="transition-colors hover:bg-security-gray-800/30">
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{account.full_name || account.username}</p>
                      <p className="text-xs text-gray-500">@{account.username}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{account.email}</td>
                    <td className="px-6 py-4">
                      <select
                        value={account.role_name}
                        disabled={isSelf || isSaving}
                        onChange={(event) => handleRoleChange(account, event.target.value)}
                        className="rounded-lg border border-security-gray-700 bg-security-black px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.name}>{role.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex max-w-sm flex-wrap gap-1">
                        {(account.permissions || []).map((permission) => (
                          <span
                            key={permission}
                            className="rounded border border-security-gray-700 px-1.5 py-0.5 text-[10px] text-gray-400"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        disabled={isSelf || isSaving}
                        onClick={() => handleStatusChange(account)}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                          account.is_active
                            ? 'bg-security-accent/10 text-security-accent'
                            : 'bg-red-500/10 text-red-400'
                        )}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : account.is_active ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                        {account.is_active ? 'Active' : 'Disabled'}
                      </button>
                      {isSelf && (
                        <p className="mt-1 text-[10px] text-gray-600">
                          Self changes are blocked
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-lg border border-security-gray-700 bg-security-gray-900/60 p-4 text-sm text-gray-400">
        <ShieldCheck className="mt-0.5 h-4 w-4 text-security-accent" />
        <p>
          Role and status updates are enforced by the API. UI controls are hidden for convenience, but unauthorized requests still receive 403 responses.
        </p>
      </div>
    </PageContainer>
  );
};

export default AdminUsers;
