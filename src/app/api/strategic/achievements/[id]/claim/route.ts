import { NextRequest, NextResponse } from 'next/server';
import { getAchievementById } from '@/lib/gamification/achievement-definitions';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const POST = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  const { id: achievementId } = await context.params;

  try {
    const achievement = getAchievementById(achievementId);

    if (!achievement) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }

    // In real implementation:
    // 1. Verify user has unlocked this achievement
    // 2. Verify it hasn't been claimed yet
    // 3. Add XP to user's total
    // 4. Mark as claimed in database

    return NextResponse.json({
      success: true,
      xpAwarded: achievement.xpReward,
      claimedAt: new Date(),
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error claiming achievement:', error);
    return NextResponse.json({ error: 'Failed to claim achievement' }, { status: 500 });
  }
});
