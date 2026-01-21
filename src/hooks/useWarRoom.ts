'use client';

import { useState, useCallback, useEffect } from 'react';
import { warRoomService } from '@/lib/war-room/war-room-service';
import type {
  WarRoom,
  WarRoomAction,
  WarRoomUpdate,
  WarRoomStatus,
  WarRoomSeverity,
  TeamMember,
} from '@/lib/war-room/war-room-types';

interface UseWarRoomReturn {
  warRoom: WarRoom | null;
  isLoading: boolean;
  error: Error | null;
  createAction: (action: Partial<WarRoomAction>) => Promise<void>;
  updateAction: (actionId: string, updates: Partial<WarRoomAction>) => Promise<void>;
  completeAction: (actionId: string) => Promise<void>;
  addMember: (userId: string, role?: TeamMember['role']) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  escalate: (reason: string) => Promise<void>;
  addUpdate: (type: WarRoomUpdate['type'], title: string, description?: string) => Promise<void>;
  updateStatus: (status: WarRoomStatus) => Promise<void>;
  updateSeverity: (severity: WarRoomSeverity) => Promise<void>;
  resolve: (resolution: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useWarRoom(id: string): UseWarRoomReturn {
  const [warRoom, setWarRoom] = useState<WarRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWarRoom = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await warRoomService.getWarRoom(id);
      setWarRoom(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch war room'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWarRoom();
  }, [fetchWarRoom]);

  const createAction = useCallback(
    async (action: Partial<WarRoomAction>) => {
      const created = await warRoomService.createAction(id, action);
      setWarRoom((prev) =>
        prev
          ? {
              ...prev,
              actions: [...prev.actions, created],
            }
          : null
      );
    },
    [id]
  );

  const updateAction = useCallback(
    async (actionId: string, updates: Partial<WarRoomAction>) => {
      const updated = await warRoomService.updateAction(id, actionId, updates);
      setWarRoom((prev) =>
        prev
          ? {
              ...prev,
              actions: prev.actions.map((a) => (a.id === actionId ? updated : a)),
            }
          : null
      );
    },
    [id]
  );

  const completeAction = useCallback(
    async (actionId: string) => {
      await updateAction(actionId, { status: 'completed', completedAt: new Date() });
    },
    [updateAction]
  );

  const addMember = useCallback(
    async (userId: string, role: TeamMember['role'] = 'member') => {
      const member = await warRoomService.addMember(id, userId, role);
      setWarRoom((prev) =>
        prev
          ? {
              ...prev,
              teamMembers: [...prev.teamMembers, member],
            }
          : null
      );
    },
    [id]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      await warRoomService.removeMember(id, userId);
      setWarRoom((prev) =>
        prev
          ? {
              ...prev,
              teamMembers: prev.teamMembers.filter((m) => m.userId !== userId),
            }
          : null
      );
    },
    [id]
  );

  const escalate = useCallback(
    async (reason: string) => {
      const updated = await warRoomService.escalate(id, reason);
      setWarRoom(updated);
    },
    [id]
  );

  const addUpdate = useCallback(
    async (type: WarRoomUpdate['type'], title: string, description?: string) => {
      const update = await warRoomService.addUpdate(id, type, title, description);
      setWarRoom((prev) =>
        prev
          ? {
              ...prev,
              updates: [update, ...prev.updates],
            }
          : null
      );
    },
    [id]
  );

  const updateStatus = useCallback(
    async (status: WarRoomStatus) => {
      const updated = await warRoomService.updateWarRoom(id, { status });
      setWarRoom(updated);
    },
    [id]
  );

  const updateSeverity = useCallback(
    async (severity: WarRoomSeverity) => {
      const updated = await warRoomService.updateWarRoom(id, { severity });
      setWarRoom(updated);
    },
    [id]
  );

  const resolve = useCallback(
    async (resolution: string) => {
      const updated = await warRoomService.resolve(id, resolution);
      setWarRoom(updated);
    },
    [id]
  );

  return {
    warRoom,
    isLoading,
    error,
    createAction,
    updateAction,
    completeAction,
    addMember,
    removeMember,
    escalate,
    addUpdate,
    updateStatus,
    updateSeverity,
    resolve,
    refresh: fetchWarRoom,
  };
}
