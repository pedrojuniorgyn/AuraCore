import { NextRequest, NextResponse } from 'next/server';
import { getAchievementById } from '@/lib/gamification/achievement-definitions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: achievementId } = await params;

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
    console.error('Error claiming achievement:', error);
    return NextResponse.json({ error: 'Failed to claim achievement' }, { status: 500 });
  }
}
