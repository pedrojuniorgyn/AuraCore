/**
 * Serviço de gamificação
 * @module lib/gamification/gamification-service
 */

import type {
  UserAchievement,
  UserPoints,
  LeaderboardEntry,
  LeaderboardFilters,
} from './gamification-types';
import { LEVELS } from './gamification-types';

class GamificationService {
  // Achievements
  async getUserAchievements(userId?: string): Promise<UserAchievement[]> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);

    const response = await fetch(`/api/strategic/achievements?${params}`);
    if (!response.ok) throw new Error('Failed to fetch achievements');
    const data = await response.json();
    return data.achievements || [];
  }

  async claimAchievement(achievementId: string): Promise<{ xpAwarded: number }> {
    const response = await fetch(`/api/strategic/achievements/${achievementId}/claim`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to claim achievement');
    return response.json();
  }

  // Points
  async getUserPoints(userId?: string): Promise<UserPoints> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);

    const response = await fetch(`/api/strategic/points?${params}`);
    if (!response.ok) throw new Error('Failed to fetch points');
    return response.json();
  }

  // Leaderboard
  async getLeaderboard(filters?: LeaderboardFilters): Promise<LeaderboardEntry[]> {
    const params = new URLSearchParams();
    if (filters?.period) params.append('period', filters.period);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`/api/strategic/leaderboard?${params}`);
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    const data = await response.json();
    return data.entries || [];
  }

  // Level calculations
  getLevelInfo(totalXp: number): { level: number; name: string; currentXp: number; nextXp: number } {
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

  // Progress calculations
  calculateAchievementProgress(current: number, target: number): number {
    return Math.min(100, Math.round((current / target) * 100));
  }
}

export const gamificationService = new GamificationService();
