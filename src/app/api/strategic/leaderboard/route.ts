import { NextRequest, NextResponse } from 'next/server';
import type { LeaderboardEntry } from '@/lib/gamification/gamification-types';

// Mock leaderboard data
const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    previousRank: 1,
    userId: 'user-1',
    userName: 'João Silva',
    level: 15,
    totalXp: 5230,
    achievementCount: 28,
    isCurrentUser: false,
  },
  {
    rank: 2,
    previousRank: 3,
    userId: 'user-2',
    userName: 'Maria Santos',
    level: 14,
    totalXp: 4850,
    achievementCount: 25,
    isCurrentUser: false,
  },
  {
    rank: 3,
    previousRank: 2,
    userId: 'user-3',
    userName: 'Pedro Alves',
    level: 13,
    totalXp: 4420,
    achievementCount: 23,
    isCurrentUser: false,
  },
  {
    rank: 4,
    previousRank: 4,
    userId: 'user-4',
    userName: 'Ana Costa',
    level: 12,
    totalXp: 3980,
    achievementCount: 21,
    isCurrentUser: false,
  },
  {
    rank: 5,
    previousRank: 7,
    userId: 'current-user',
    userName: 'Você',
    level: 12,
    totalXp: 2450,
    achievementCount: 23,
    isCurrentUser: true,
  },
  {
    rank: 6,
    previousRank: 5,
    userId: 'user-5',
    userName: 'Carlos Lima',
    level: 11,
    totalXp: 2100,
    achievementCount: 18,
    isCurrentUser: false,
  },
  {
    rank: 7,
    previousRank: 7,
    userId: 'user-6',
    userName: 'Julia Reis',
    level: 10,
    totalXp: 1890,
    achievementCount: 15,
    isCurrentUser: false,
  },
  {
    rank: 8,
    previousRank: 8,
    userId: 'user-7',
    userName: 'Roberto Souza',
    level: 9,
    totalXp: 1650,
    achievementCount: 14,
    isCurrentUser: false,
  },
  {
    rank: 9,
    previousRank: 10,
    userId: 'user-8',
    userName: 'Fernanda Oliveira',
    level: 8,
    totalXp: 1420,
    achievementCount: 12,
    isCurrentUser: false,
  },
  {
    rank: 10,
    previousRank: 9,
    userId: 'user-9',
    userName: 'Lucas Martins',
    level: 7,
    totalXp: 1200,
    achievementCount: 10,
    isCurrentUser: false,
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'month';
  const department = searchParams.get('department');
  const limit = parseInt(searchParams.get('limit') || '20');

  // In real implementation, filter by period and department
  let entries = [...mockLeaderboard];

  // Apply limit
  entries = entries.slice(0, limit);

  return NextResponse.json({ entries, period, department });
}
