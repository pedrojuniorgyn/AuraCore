'use client';

import { useState, useCallback, useEffect } from 'react';
import { gamificationService } from '@/lib/gamification/gamification-service';
import type { UserPoints } from '@/lib/gamification/gamification-types';

interface UseUserPointsReturn {
  points: UserPoints | null;
  isLoading: boolean;
  error: Error | null;
  levelProgress: number;
  refresh: () => Promise<void>;
}

export function useUserPoints(): UseUserPointsReturn {
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPoints = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await gamificationService.getUserPoints();
      setPoints(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch points'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const levelProgress =
    points && points.nextLevelXp > 0
      ? Math.round((points.currentLevelXp / points.nextLevelXp) * 100)
      : 0;

  return {
    points,
    isLoading,
    error,
    levelProgress,
    refresh: fetchPoints,
  };
}
