import { NextRequest, NextResponse } from 'next/server';
import { ACHIEVEMENTS } from '@/lib/gamification/achievement-definitions';
import type { UserAchievement } from '@/lib/gamification/gamification-types';

// Mock user achievements store
const userAchievementsStore = new Map<string, UserAchievement[]>();

function initializeMockData(userId: string) {
  if (userAchievementsStore.has(userId)) return;

  const now = new Date();
  const userAchievements: UserAchievement[] = ACHIEVEMENTS.filter((a) => !a.isSecret).map(
    (achievement, index) => {
      // Simulate some unlocked achievements
      const isUnlocked = index < 8;
      const isClaimed = index < 5;
      const progress = isUnlocked
        ? achievement.maxProgress || 1
        : Math.floor(Math.random() * (achievement.maxProgress || 1));

      return {
        id: `ua-${achievement.id}`,
        userId,
        achievementId: achievement.id,
        achievement,
        progress,
        isUnlocked,
        unlockedAt: isUnlocked
          ? new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          : undefined,
        isClaimed,
        claimedAt: isClaimed
          ? new Date(now.getTime() - Math.random() * 20 * 24 * 60 * 60 * 1000)
          : undefined,
      };
    }
  );

  userAchievementsStore.set(userId, userAchievements);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'current-user';

  initializeMockData(userId);

  const achievements = userAchievementsStore.get(userId) || [];

  return NextResponse.json({ achievements });
}
