'use client';

import { useState, useCallback, useEffect } from 'react';
import { gamificationService } from '@/lib/gamification/gamification-service';
import type { UserAchievement } from '@/lib/gamification/gamification-types';

interface UseAchievementsReturn {
  achievements: UserAchievement[];
  unlockedCount: number;
  totalCount: number;
  recentUnlocks: UserAchievement[];
  isLoading: boolean;
  error: Error | null;
  claimAchievement: (id: string) => Promise<number>;
  refresh: () => Promise<void>;
}

export function useAchievements(): UseAchievementsReturn {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAchievements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await gamificationService.getUserAchievements();
      setAchievements(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch achievements'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const claimAchievement = useCallback(async (id: string): Promise<number> => {
    const result = await gamificationService.claimAchievement(id);
    setAchievements((prev) =>
      prev.map((a) =>
        a.achievementId === id ? { ...a, isClaimed: true, claimedAt: new Date() } : a
      )
    );
    return result.xpAwarded;
  }, []);

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;
  const recentUnlocks = achievements
    .filter((a) => a.isUnlocked)
    .sort((a, b) => {
      if (!a.unlockedAt || !b.unlockedAt) return 0;
      return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
    })
    .slice(0, 5);

  return {
    achievements,
    unlockedCount,
    totalCount,
    recentUnlocks,
    isLoading,
    error,
    claimAchievement,
    refresh: fetchAchievements,
  };
}
