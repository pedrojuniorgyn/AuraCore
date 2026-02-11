import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import type { UserPoints } from '@/lib/gamification/gamification-types';
import { LEVELS } from '@/lib/gamification/gamification-types';
import { withDI } from '@/shared/infrastructure/di/with-di';

function getLevelInfo(totalXp: number): { level: number; name: string; currentXp: number; nextXp: number } {
  let currentLevel = LEVELS[0];

  for (const level of LEVELS) {
    if (totalXp >= level.minXp) {
      currentLevel = level;
    } else {
      break;
    }
  }

  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1);
  const currentXp = totalXp - currentLevel.minXp;
  const nextXp = nextLevel ? nextLevel.minXp - currentLevel.minXp : 0;

  return {
    level: currentLevel.level,
    name: currentLevel.name,
    currentXp,
    nextXp,
  };
}

export const GET = withDI(async () => {
  const ctx = await getTenantContext();
  const userId = ctx.userId;

  // Mock user points data
  const totalXp = 2450;
  const levelInfo = getLevelInfo(totalXp);

  const userPoints: UserPoints = {
    userId,
    totalXp,
    currentLevelXp: levelInfo.currentXp,
    level: levelInfo.level,
    levelName: levelInfo.name,
    nextLevelXp: levelInfo.nextXp,
    xpFromAchievements: 1500,
    xpFromKpis: 600,
    xpFromActionPlans: 250,
    xpFromStreak: 100,
    currentStreak: 15,
    longestStreak: 32,
    lastActiveDate: new Date(),
    totalAchievements: 20,
    unlockedAchievements: 8,
  };

  return NextResponse.json(userPoints);
});
