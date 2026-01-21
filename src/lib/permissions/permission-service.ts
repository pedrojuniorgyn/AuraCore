/**
 * Serviço de permissões para o módulo Strategic
 * @module lib/permissions/permission-service
 */

import type { Role, UserWithRoles, Permission, Resource, Action } from './permission-types';

class PermissionService {
  // Roles CRUD
  async getRoles(): Promise<Role[]> {
    const response = await fetch('/api/strategic/roles');
    if (!response.ok) throw new Error('Failed to fetch roles');
    const data = await response.json();
    return data.roles || [];
  }

  async getRole(id: string): Promise<Role> {
    const response = await fetch(`/api/strategic/roles/${id}`);
    if (!response.ok) throw new Error('Failed to fetch role');
    return response.json();
  }

  async createRole(role: Partial<Role>): Promise<Role> {
    const response = await fetch('/api/strategic/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(role),
    });
    if (!response.ok) throw new Error('Failed to create role');
    return response.json();
  }

  async updateRole(id: string, updates: Partial<Role>): Promise<Role> {
    const response = await fetch(`/api/strategic/roles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update role');
    return response.json();
  }

  async deleteRole(id: string): Promise<void> {
    const response = await fetch(`/api/strategic/roles/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete role');
  }

  // User role assignments
  async getUserRoles(userId: string): Promise<Role[]> {
    const response = await fetch(`/api/strategic/users/${userId}/roles`);
    if (!response.ok) throw new Error('Failed to fetch user roles');
    const data = await response.json();
    return data.roles || [];
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    const response = await fetch(`/api/strategic/users/${userId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId }),
    });
    if (!response.ok) throw new Error('Failed to assign role');
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const response = await fetch(`/api/strategic/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove role');
  }

  // Get users with their roles
  async getUsersWithRoles(search?: string): Promise<UserWithRoles[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const response = await fetch(`/api/strategic/users/with-roles?${params}`);
    if (!response.ok) throw new Error('Failed to fetch users');
    const data = await response.json();
    return data.users || [];
  }

  // Convert permission to slug format for backend
  permissionToSlug(permission: Permission): string {
    return `strategic.${permission.resource}.${permission.action}`;
  }

  // Convert slug to permission object
  slugToPermission(slug: string): Permission | null {
    const parts = slug.split('.');
    if (parts.length < 3 || parts[0] !== 'strategic') return null;
    return {
      resource: parts[1] as Resource,
      action: parts[2] as Action,
    };
  }
}

export const permissionService = new PermissionService();
