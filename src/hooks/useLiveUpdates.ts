'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WarRoomUpdate } from '@/lib/war-room/war-room-types';

interface UseLiveUpdatesReturn {
  updates: WarRoomUpdate[];
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
}

export function useLiveUpdates(warRoomId: string): UseLiveUpdatesReturn {
  const [updates, setUpdates] = useState<WarRoomUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUpdateRef = useRef<string | null>(null);

  const fetchUpdates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (lastUpdateRef.current) {
        params.append('after', lastUpdateRef.current);
      }

      const response = await fetch(`/api/strategic/war-room/${warRoomId}/updates?${params}`);
      if (!response.ok) throw new Error('Failed to fetch updates');

      const data = await response.json();
      const newUpdates = data.updates || [];

      if (newUpdates.length > 0) {
        setUpdates((prev) => [...newUpdates, ...prev]);
        lastUpdateRef.current = newUpdates[0].id;
      }

      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Connection failed'));
      setIsConnected(false);
    }
  }, [warRoomId]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    // Initial fetch
    fetchUpdates();

    // Poll every 5 seconds
    pollingRef.current = setInterval(fetchUpdates, 5000);
  }, [fetchUpdates]);

  const reconnect = useCallback(() => {
    lastUpdateRef.current = null;
    setUpdates([]);
    startPolling();
  }, [startPolling]);

  useEffect(() => {
    startPolling();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [startPolling]);

  return {
    updates,
    isConnected,
    error,
    reconnect,
  };
}
