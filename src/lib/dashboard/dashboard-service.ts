/**
 * Serviço de dashboards
 * @module lib/dashboard/dashboard-service
 */

import type { Dashboard, DashboardFilters, Widget } from './dashboard-types';

class DashboardService {
  async getDashboards(filters?: DashboardFilters): Promise<Dashboard[]> {
    const params = new URLSearchParams();
    if (filters?.visibility) params.append('visibility', filters.visibility);
    if (filters?.ownerId) params.append('ownerId', filters.ownerId);
    if (filters?.search) params.append('search', filters.search);

    const response = await fetch(`/api/strategic/dashboards?${params}`);
    if (!response.ok) throw new Error('Failed to fetch dashboards');
    const data = await response.json();
    return data.dashboards || [];
  }

  async getDashboard(id: string): Promise<Dashboard | null> {
    const response = await fetch(`/api/strategic/dashboards/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch dashboard');
    }
    return response.json();
  }

  async createDashboard(
    data: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Dashboard> {
    const response = await fetch('/api/strategic/dashboards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create dashboard');
    return response.json();
  }

  async updateDashboard(id: string, data: Partial<Dashboard>): Promise<Dashboard> {
    const response = await fetch(`/api/strategic/dashboards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update dashboard');
    return response.json();
  }

  async deleteDashboard(id: string): Promise<void> {
    const response = await fetch(`/api/strategic/dashboards/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete dashboard');
  }

  async saveWidgets(dashboardId: string, widgets: Widget[]): Promise<void> {
    const response = await fetch(`/api/strategic/dashboards/${dashboardId}/widgets`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgets }),
    });
    if (!response.ok) throw new Error('Failed to save widgets');
  }

  async getDefaultDashboard(): Promise<Dashboard | null> {
    const dashboards = await this.getDashboards();
    return dashboards.find((d) => d.isDefault) || dashboards[0] || null;
  }

  async setDefaultDashboard(id: string): Promise<void> {
    await this.updateDashboard(id, { isDefault: true });
  }
}

export const dashboardService = new DashboardService();
