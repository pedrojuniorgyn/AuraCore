/**
 * Tipos para o sistema de gamificação
 * @module lib/gamification/gamification-types
 */

export type AchievementCategory =
  | 'kpi'
  | 'action_plan'
  | 'pdca'
  | 'goal'
  | 'collaboration'
  | 'engagement'
  | 'streak'
  | 'milestone';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  xpReward: number;
  condition: AchievementCondition;
  isProgressive: boolean;
  maxProgress?: number;
  isSecret: boolean;
  order: number;
}

export interface AchievementCondition {
  type: 'count' | 'streak' | 'threshold' | 'combination' | 'time_based';
  metric: string;
  target: number;
  timeframe?: 'day' | 'week' | 'month' | 'all_time';
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievement: Achievement;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  isClaimed: boolean;
  claimedAt?: Date;
}

export interface UserPoints {
  userId: string;
  totalXp: number;
  currentLevelXp: number;
  level: number;
  levelName: string;
  nextLevelXp: number;
  xpFromAchievements: number;
  xpFromKpis: number;
  xpFromActionPlans: number;
  xpFromStreak: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date;
  totalAchievements: number;
  unlockedAchievements: number;
}

export interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  level: number;
  totalXp: number;
  achievementCount: number;
  isCurrentUser: boolean;
}

export interface LeaderboardFilters {
  period: 'week' | 'month' | 'quarter' | 'year' | 'all_time';
  department?: string;
  limit?: number;
}

export const LEVELS: { level: number; name: string; minXp: number }[] = [
  { level: 1, name: 'Iniciante', minXp: 0 },
  { level: 2, name: 'Aprendiz', minXp: 100 },
  { level: 3, name: 'Praticante', minXp: 250 },
  { level: 4, name: 'Competente', minXp: 500 },
  { level: 5, name: 'Proficiente', minXp: 850 },
  { level: 6, name: 'Experiente', minXp: 1300 },
  { level: 7, name: 'Avançado', minXp: 1850 },
  { level: 8, name: 'Expert', minXp: 2500 },
  { level: 9, name: 'Mestre', minXp: 3300 },
  { level: 10, name: 'Grão-Mestre', minXp: 4200 },
  { level: 11, name: 'Lenda', minXp: 5200 },
  { level: 12, name: 'Estrategista', minXp: 6300 },
  { level: 13, name: 'Visionário', minXp: 7500 },
  { level: 14, name: 'Guru', minXp: 8800 },
  { level: 15, name: 'Iluminado', minXp: 10200 },
];

export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: 'from-gray-400 to-gray-500',
  uncommon: 'from-green-400 to-green-500',
  rare: 'from-blue-400 to-blue-500',
  epic: 'from-purple-400 to-purple-500',
  legendary: 'from-yellow-400 to-orange-500',
};

export const RARITY_LABELS: Record<AchievementRarity, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  kpi: 'KPIs',
  action_plan: 'Planos de Ação',
  pdca: 'Ciclos PDCA',
  goal: 'Metas',
  collaboration: 'Colaboração',
  engagement: 'Engajamento',
  streak: 'Sequências',
  milestone: 'Marcos',
};

export const CATEGORY_ICONS: Record<AchievementCategory, string> = {
  kpi: '📊',
  action_plan: '📋',
  pdca: '🔄',
  goal: '🎯',
  collaboration: '🤝',
  engagement: '💡',
  streak: '🔥',
  milestone: '🏆',
};
