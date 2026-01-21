'use client';

/**
 * Hook para gerenciar roles do módulo Strategic
 * @module hooks/useRoles
 */

import { useState, useCallback, useEffect } from 'react';
import { permissionService } from '@/lib/permissions/permission-service';
import type { Role, UserWithRoles } from '@/lib/permissions/permission-types';

interface UseRolesReturn {
  roles: Role[];
  users: UserWithRoles[];
  isLoading: boolean;
  error: Error | null;

  // Role actions
  createRole: (role: Partial<Role>) => Promise<Role>;
  updateRole: (id: string, updates: Partial<Role>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;

  // User role actions
  assignRole: (userId: string, roleId: string) => Promise<void>;
  removeRole: (userId: string, roleId: string) => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
}

export function useRoles(): UseRolesReturn {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [rolesData, usersData] = await Promise.all([
        permissionService.getRoles(),
        permissionService.getUsersWithRoles(),
      ]);

      setRoles(rolesData);
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createRole = useCallback(async (role: Partial<Role>) => {
    const created = await permissionService.createRole(role);
    setRoles((prev) => [...prev, created]);
    return created;
  }, []);

  const updateRole = useCallback(async (id: string, updates: Partial<Role>) => {
    const updated = await permissionService.updateRole(id, updates);
    setRoles((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }, []);

  const deleteRole = useCallback(async (id: string) => {
    await permissionService.deleteRole(id);
    setRoles((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const assignRole = useCallback(async (userId: string, roleId: string) => {
    await permissionService.assignRole(userId, roleId);
    // Refresh users to update role assignments
    const usersData = await permissionService.getUsersWithRoles();
    setUsers(usersData);
  }, []);

  const removeRole = useCallback(async (userId: string, roleId: string) => {
    await permissionService.removeRole(userId, roleId);
    // Refresh users to update role assignments
    const usersData = await permissionService.getUsersWithRoles();
    setUsers(usersData);
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    const usersData = await permissionService.getUsersWithRoles(query);
    setUsers(usersData);
  }, []);

  return {
    roles,
    users,
    isLoading,
    error,
    createRole,
    updateRole,
    deleteRole,
    assignRole,
    removeRole,
    refresh: fetchData,
    searchUsers,
  };
}
