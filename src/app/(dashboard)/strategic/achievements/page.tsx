'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Search } from 'lucide-react';
import { useAchievements } from '@/hooks/useAchievements';
import { useUserPoints } from '@/hooks/useUserPoints';
import {
  AchievementCard,
  AchievementUnlock,
  LevelProgress,
  StreakTracker,
} from '@/components/strategic/gamification';
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from '@/lib/gamification/gamification-types';
import type { AchievementCategory, Achievement } from '@/lib/gamification/gamification-types';
import { toast } from 'sonner';

export default function AchievementsPage() {
  const { achievements, recentUnlocks, claimAchievement } = useAchievements();
  const { points, refresh: refreshPoints } = useUserPoints();
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);

  const filteredAchievements = achievements.filter((ua) => {
    if (selectedCategory !== 'all' && ua.achievement.category !== selectedCategory) {
      return false;
    }
    if (
      searchQuery &&
      !ua.achievement.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !ua.achievement.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const categories = Object.keys(CATEGORY_LABELS) as AchievementCategory[];

  const getCategoryStats = (category: AchievementCategory) => {
    const categoryAchievements = achievements.filter((ua) => ua.achievement.category === category);
    const unlocked = categoryAchievements.filter((ua) => ua.isUnlocked).length;
    return { unlocked, total: categoryAchievements.length };
  };

  const handleClaim = async (achievementId: string, achievement: Achievement) => {
    try {
      const xp = await claimAchievement(achievementId);
      setUnlockedAchievement(achievement);
      refreshPoints();
      toast.success(`+${xp} XP recebidos!`);
    } catch {
      toast.error('Erro ao resgatar conquista');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <Trophy className="text-purple-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Conquistas</h1>
            <p className="text-white/60">Desbloqueie conquistas e ganhe XP</p>
          </div>
        </div>

        {/* Level Progress & Streak */}
        {points && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <LevelProgress points={points} />
            </div>
            <StreakTracker
              currentStreak={points.currentStreak}
              longestStreak={points.longestStreak}
              lastActiveDate={points.lastActiveDate}
            />
          </div>
        )}

        {/* Recent Unlocks */}
        {recentUnlocks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Star className="text-yellow-400" size={20} />
              Conquistas Recentes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentUnlocks.slice(0, 3).map((ua) => (
                <motion.div
                  key={ua.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 
                    rounded-xl border border-purple-500/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{ua.achievement.icon}</span>
                    <div>
                      <h3 className="text-white font-medium">{ua.achievement.name}</h3>
                      <p className="text-purple-400 text-sm">+{ua.achievement.xpReward} XP</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conquistas..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white placeholder:text-white/30
                focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-colors
                ${
                  selectedCategory === 'all'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/5 text-white/60 hover:text-white'
                }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap transition-colors
                  flex items-center gap-2
                  ${
                    selectedCategory === cat
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                <span>{CATEGORY_LABELS[cat]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Achievements by Category */}
        {selectedCategory === 'all' ? (
          <div className="space-y-8">
            {categories.map((category) => {
              const stats = getCategoryStats(category);
              const categoryAchievements = filteredAchievements.filter(
                (ua) => ua.achievement.category === category
              );

              if (categoryAchievements.length === 0) return null;

              return (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{CATEGORY_ICONS[category]}</span>
                    <h2 className="text-white font-semibold">{CATEGORY_LABELS[category]}</h2>
                    <span className="text-white/40 text-sm">
                      ({stats.unlocked}/{stats.total})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryAchievements.map((ua) => (
                      <AchievementCard
                        key={ua.id}
                        userAchievement={ua}
                        onClaim={
                          ua.isUnlocked && !ua.isClaimed
                            ? () => handleClaim(ua.achievementId, ua.achievement)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((ua) => (
              <AchievementCard
                key={ua.id}
                userAchievement={ua}
                onClaim={
                  ua.isUnlocked && !ua.isClaimed
                    ? () => handleClaim(ua.achievementId, ua.achievement)
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="mx-auto mb-4 text-white/20" size={48} />
            <p className="text-white/40">Nenhuma conquista encontrada</p>
          </div>
        )}
      </div>

      {/* Unlock Modal */}
      <AchievementUnlock
        achievement={unlockedAchievement}
        onClose={() => setUnlockedAchievement(null)}
      />
    </div>
  );
}
