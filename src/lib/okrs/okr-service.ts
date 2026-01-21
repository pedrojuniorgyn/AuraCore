/**
 * Serviço de OKRs
 * @module lib/okrs/okr-service
 */

import type { OKR, KeyResult, OKRFilters, OKRTreeNode } from './okr-types';

class OKRService {
  async getOKRs(filters?: OKRFilters): Promise<OKR[]> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.level) {
        const levels = Array.isArray(filters.level) ? filters.level : [filters.level];
        levels.forEach((l) => params.append('level', l));
      }
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        statuses.forEach((s) => params.append('status', s));
      }
      if (filters.ownerId) params.append('ownerId', filters.ownerId);
      if (filters.periodType) params.append('periodType', filters.periodType);
      if (filters.search) params.append('search', filters.search);
      if (filters.parentId !== undefined) {
        params.append('parentId', filters.parentId || 'null');
      }
    }

    const response = await fetch(`/api/strategic/okrs?${params}`);
    if (!response.ok) throw new Error('Failed to fetch OKRs');
    const data = await response.json();
    return data.okrs || [];
  }

  async getOKR(id: string): Promise<OKR> {
    const response = await fetch(`/api/strategic/okrs/${id}`);
    if (!response.ok) throw new Error('Failed to fetch OKR');
    return response.json();
  }

  async createOKR(okr: Partial<OKR>): Promise<OKR> {
    const response = await fetch('/api/strategic/okrs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(okr),
    });
    if (!response.ok) throw new Error('Failed to create OKR');
    return response.json();
  }

  async updateOKR(id: string, updates: Partial<OKR>): Promise<OKR> {
    const response = await fetch(`/api/strategic/okrs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update OKR');
    return response.json();
  }

  async deleteOKR(id: string): Promise<void> {
    const response = await fetch(`/api/strategic/okrs/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete OKR');
  }

  async addKeyResult(okrId: string, keyResult: Partial<KeyResult>): Promise<KeyResult> {
    const response = await fetch(`/api/strategic/okrs/${okrId}/key-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keyResult),
    });
    if (!response.ok) throw new Error('Failed to add key result');
    return response.json();
  }

  async updateKeyResult(
    okrId: string,
    krId: string,
    updates: Partial<KeyResult>
  ): Promise<KeyResult> {
    const response = await fetch(`/api/strategic/okrs/${okrId}/key-results/${krId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update key result');
    return response.json();
  }

  async updateKeyResultValue(
    okrId: string,
    krId: string,
    value: number,
    comment?: string
  ): Promise<KeyResult> {
    const response = await fetch(`/api/strategic/okrs/${okrId}/key-results/${krId}/value`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, comment }),
    });
    if (!response.ok) throw new Error('Failed to update key result value');
    return response.json();
  }

  async deleteKeyResult(okrId: string, krId: string): Promise<void> {
    const response = await fetch(`/api/strategic/okrs/${okrId}/key-results/${krId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete key result');
  }

  async getOKRTree(periodLabel?: string): Promise<OKRTreeNode[]> {
    const params = new URLSearchParams();
    if (periodLabel) params.append('period', periodLabel);

    const response = await fetch(`/api/strategic/okrs/tree?${params}`);
    if (!response.ok) throw new Error('Failed to fetch OKR tree');
    const data = await response.json();
    return data.tree || [];
  }

  calculateProgress(keyResults: KeyResult[]): number {
    if (keyResults.length === 0) return 0;

    const totalWeight = keyResults.reduce((sum, kr) => sum + kr.weight, 0);
    const weightedProgress = keyResults.reduce((sum, kr) => {
      return sum + kr.progress * kr.weight;
    }, 0);

    return Math.round(weightedProgress / totalWeight);
  }

  calculateKeyResultProgress(kr: KeyResult): number {
    const range = kr.targetValue - kr.startValue;
    if (range === 0) return kr.currentValue >= kr.targetValue ? 100 : 0;

    const progress = ((kr.currentValue - kr.startValue) / range) * 100;
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  getKeyResultStatus(kr: KeyResult): KeyResult['status'] {
    if (kr.progress >= 100) return 'completed';
    if (kr.progress === 0) return 'not_started';
    if (kr.progress >= 70) return 'on_track';
    if (kr.progress >= 40) return 'at_risk';
    return 'behind';
  }
}

export const okrService = new OKRService();
