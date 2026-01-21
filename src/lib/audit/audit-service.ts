/**
 * Serviço de auditoria para o módulo Strategic
 * @module lib/audit/audit-service
 */

import type {
  AuditLog,
  AuditFilter,
  AuditLogResponse,
  EntityHistory,
  VersionComparison,
  AuditEntityType,
  AuditAction,
  AuditChange,
} from './audit-types';

class AuditService {
  // Get audit logs with filters
  async getLogs(filter?: AuditFilter): Promise<AuditLogResponse> {
    const params = new URLSearchParams();

    if (filter?.startDate) params.append('startDate', filter.startDate.toISOString());
    if (filter?.endDate) params.append('endDate', filter.endDate.toISOString());
    if (filter?.userId) params.append('userId', filter.userId);
    if (filter?.entityType) params.append('entityType', filter.entityType);
    if (filter?.entityId) params.append('entityId', filter.entityId);
    if (filter?.action) params.append('action', filter.action);
    if (filter?.searchQuery) params.append('q', filter.searchQuery);
    if (filter?.page) params.append('page', filter.page.toString());
    if (filter?.pageSize) params.append('pageSize', filter.pageSize.toString());

    const response = await fetch(`/api/strategic/audit?${params}`);
    if (!response.ok) throw new Error('Failed to fetch audit logs');
    return response.json();
  }

  // Get single audit log details
  async getLog(id: string): Promise<AuditLog> {
    const response = await fetch(`/api/strategic/audit/${id}`);
    if (!response.ok) throw new Error('Failed to fetch audit log');
    return response.json();
  }

  // Get entity history (all versions)
  async getEntityHistory(
    entityType: AuditEntityType,
    entityId: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<EntityHistory> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString());

    const response = await fetch(
      `/api/strategic/audit/entity/${entityType}/${entityId}?${params}`
    );
    if (!response.ok) throw new Error('Failed to fetch entity history');
    return response.json();
  }

  // Compare two versions of an entity
  async compareVersions(
    entityType: AuditEntityType,
    entityId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<VersionComparison> {
    const params = new URLSearchParams({
      from: fromVersion.toString(),
      to: toVersion.toString(),
    });

    const response = await fetch(
      `/api/strategic/audit/entity/${entityType}/${entityId}/compare?${params}`
    );
    if (!response.ok) throw new Error('Failed to compare versions');
    return response.json();
  }

  // Export audit logs
  async exportLogs(
    filter?: AuditFilter,
    format: 'csv' | 'xlsx' = 'xlsx'
  ): Promise<Blob> {
    const params = new URLSearchParams({ format });

    if (filter?.startDate) params.append('startDate', filter.startDate.toISOString());
    if (filter?.endDate) params.append('endDate', filter.endDate.toISOString());
    if (filter?.userId) params.append('userId', filter.userId);
    if (filter?.entityType) params.append('entityType', filter.entityType);
    if (filter?.action) params.append('action', filter.action);

    const response = await fetch(`/api/strategic/audit/export?${params}`);
    if (!response.ok) throw new Error('Failed to export audit logs');
    return response.blob();
  }

  // Restore deleted entity (soft delete undo)
  async restoreEntity(entityType: AuditEntityType, entityId: string): Promise<void> {
    const response = await fetch(
      `/api/strategic/audit/entity/${entityType}/${entityId}/restore`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to restore entity');
  }

  // Calculate diff between two objects
  calculateChanges(
    previous: Record<string, unknown>,
    current: Record<string, unknown>,
    fieldLabels?: Record<string, string>
  ): AuditChange[] {
    const changes: AuditChange[] = [];
    const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);

    for (const key of allKeys) {
      const prevValue = previous[key];
      const currValue = current[key];

      // Skip internal fields
      if (['id', 'createdAt', 'updatedAt', 'deletedAt', 'version'].includes(key)) {
        continue;
      }

      if (prevValue === undefined && currValue !== undefined) {
        changes.push({
          field: key,
          fieldLabel: fieldLabels?.[key],
          previousValue: null,
          newValue: currValue,
          changeType: 'added',
        });
      } else if (prevValue !== undefined && currValue === undefined) {
        changes.push({
          field: key,
          fieldLabel: fieldLabels?.[key],
          previousValue: prevValue,
          newValue: null,
          changeType: 'removed',
        });
      } else if (JSON.stringify(prevValue) !== JSON.stringify(currValue)) {
        changes.push({
          field: key,
          fieldLabel: fieldLabels?.[key],
          previousValue: prevValue,
          newValue: currValue,
          changeType: 'modified',
        });
      }
    }

    return changes;
  }
}

export const auditService = new AuditService();
