/**
 * Serviço de War Room
 * @module lib/war-room/war-room-service
 */

import type {
  WarRoom,
  WarRoomAction,
  WarRoomUpdate,
  WarRoomStatus,
  WarRoomSeverity,
  TeamMember,
} from './war-room-types';

class WarRoomService {
  async getWarRooms(status?: WarRoomStatus): Promise<WarRoom[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await fetch(`/api/strategic/war-room?${params}`);
    if (!response.ok) throw new Error('Failed to fetch war rooms');
    const data = await response.json();
    return data.warRooms || [];
  }

  async getWarRoom(id: string): Promise<WarRoom | null> {
    const response = await fetch(`/api/strategic/war-room/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch war room');
    }
    return response.json();
  }

  async createWarRoom(
    data: Omit<WarRoom, 'id' | 'createdAt' | 'updatedAt' | 'updates' | 'escalationHistory'>
  ): Promise<WarRoom> {
    const response = await fetch('/api/strategic/war-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create war room');
    return response.json();
  }

  async updateWarRoom(id: string, data: Partial<WarRoom>): Promise<WarRoom> {
    const response = await fetch(`/api/strategic/war-room/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update war room');
    return response.json();
  }

  async createAction(id: string, action: Partial<WarRoomAction>): Promise<WarRoomAction> {
    const response = await fetch(`/api/strategic/war-room/${id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    if (!response.ok) throw new Error('Failed to create action');
    return response.json();
  }

  async updateAction(
    warRoomId: string,
    actionId: string,
    updates: Partial<WarRoomAction>
  ): Promise<WarRoomAction> {
    const response = await fetch(`/api/strategic/war-room/${warRoomId}/actions/${actionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update action');
    return response.json();
  }

  async addMember(
    id: string,
    userId: string,
    role: TeamMember['role']
  ): Promise<TeamMember> {
    const response = await fetch(`/api/strategic/war-room/${id}/team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    if (!response.ok) throw new Error('Failed to add member');
    return response.json();
  }

  async removeMember(id: string, userId: string): Promise<void> {
    const response = await fetch(`/api/strategic/war-room/${id}/team/${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove member');
  }

  async escalate(id: string, reason: string): Promise<WarRoom> {
    const response = await fetch(`/api/strategic/war-room/${id}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error('Failed to escalate');
    return response.json();
  }

  async addUpdate(
    id: string,
    type: WarRoomUpdate['type'],
    title: string,
    description?: string
  ): Promise<WarRoomUpdate> {
    const response = await fetch(`/api/strategic/war-room/${id}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title, description }),
    });
    if (!response.ok) throw new Error('Failed to add update');
    return response.json();
  }

  async resolve(id: string, resolution: string): Promise<WarRoom> {
    const response = await fetch(`/api/strategic/war-room/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution }),
    });
    if (!response.ok) throw new Error('Failed to resolve');
    return response.json();
  }
}

export const warRoomService = new WarRoomService();
