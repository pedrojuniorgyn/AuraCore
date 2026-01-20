/**
 * API: GET /api/strategic/achievements
 * Retorna dados de gamificação do usuário
 * 
 * @module app/api/strategic/achievements
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Buscar dados reais via repositories
    // Por enquanto, mock data para desenvolvimento
    const mockData = {
      player: {
        id: session.user?.id || 'user-1',
        name: session.user?.name || 'Usuário',
        avatar: '😎',
        title: 'Estrategista Sênior',
        level: 12,
        currentXp: 2450,
        nextLevelXp: 3000,
        totalBadges: 18,
        rank: 3,
        streak: 7,
      },
      challenges: [
        { 
          id: '1', 
          title: 'Completar 5 ciclos PDCA', 
          description: 'Finalize 5 ciclos do início ao fim', 
          progress: 80, 
          xpReward: 500, 
          daysRemaining: 3 
        },
        { 
          id: '2', 
          title: 'Atingir 3 KPIs', 
          description: 'Alcance a meta de 3 indicadores', 
          progress: 60, 
          xpReward: 300, 
          daysRemaining: 5 
        },
        { 
          id: '3', 
          title: 'Streak de 7 dias', 
          description: 'Acesse o sistema por 7 dias seguidos', 
          progress: 85, 
          xpReward: 200, 
          daysRemaining: 2 
        },
      ],
      unlockedBadges: [
        { 
          id: '1', 
          name: 'Primeiro Passo', 
          description: 'Criou seu primeiro plano de ação', 
          icon: 'star', 
          rarity: 'COMMON', 
          xpReward: 50, 
          unlockedAt: new Date().toISOString() 
        },
        { 
          id: '2', 
          name: 'Estrategista', 
          description: 'Completou 10 ciclos PDCA', 
          icon: 'target', 
          rarity: 'RARE', 
          xpReward: 200, 
          unlockedAt: new Date().toISOString() 
        },
        { 
          id: '3', 
          name: 'Mestre KPI', 
          description: 'Atingiu 100% em 5 KPIs', 
          icon: 'trophy', 
          rarity: 'EPIC', 
          xpReward: 500, 
          unlockedAt: new Date().toISOString() 
        },
        { 
          id: '4', 
          name: 'Lenda Estratégica', 
          description: 'Top 1 do ranking por 30 dias', 
          icon: 'crown', 
          rarity: 'LEGENDARY', 
          xpReward: 1000, 
          unlockedAt: new Date().toISOString() 
        },
        { 
          id: '5', 
          name: 'Velocista', 
          description: 'Complete 3 planos em 1 dia', 
          icon: 'zap', 
          rarity: 'RARE', 
          xpReward: 150, 
          unlockedAt: new Date().toISOString() 
        },
        { 
          id: '6', 
          name: 'Focado', 
          description: 'Streak de 30 dias', 
          icon: 'flame', 
          rarity: 'EPIC', 
          xpReward: 400, 
          unlockedAt: new Date().toISOString() 
        },
      ],
      allBadges: [
        { 
          id: '1', 
          name: 'Primeiro Passo', 
          description: 'Criou seu primeiro plano de ação', 
          icon: 'star', 
          rarity: 'COMMON', 
          xpReward: 50, 
          unlockedAt: new Date().toISOString() 
        },
        { 
          id: '2', 
          name: 'Estrategista', 
          description: 'Completou 10 ciclos PDCA', 
          icon: 'target', 
          rarity: 'RARE', 
          xpReward: 200, 
          unlockedAt: new Date().toISOString() 
        },
        { 
          id: '3', 
          name: 'Mestre KPI', 
          description: 'Atingiu 100% em 5 KPIs', 
          icon: 'trophy', 
          rarity: 'EPIC', 
          xpReward: 500, 
          unlockedAt: new Date().toISOString() 
        },
        { 
          id: '4', 
          name: 'Lenda Estratégica', 
          description: 'Top 1 do ranking por 30 dias', 
          icon: 'crown', 
          rarity: 'LEGENDARY', 
          xpReward: 1000, 
          unlockedAt: new Date().toISOString() 
        },
        { 
          id: '7', 
          name: 'Perfeccionista', 
          description: 'Atinja 100% em todos os KPIs', 
          icon: 'award', 
          rarity: 'LEGENDARY', 
          xpReward: 2000, 
          progress: 40 
        },
        { 
          id: '8', 
          name: 'Maratonista', 
          description: 'Streak de 100 dias', 
          icon: 'flame', 
          rarity: 'LEGENDARY', 
          xpReward: 1500, 
          progress: 7 
        },
        { 
          id: '9', 
          name: 'Velocista Pro', 
          description: 'Complete 10 planos em 1 semana', 
          icon: 'zap', 
          rarity: 'EPIC', 
          xpReward: 600, 
          progress: 30 
        },
        { 
          id: '10', 
          name: 'Mentor', 
          description: 'Ajude 5 colegas a atingir metas', 
          icon: 'star', 
          rarity: 'RARE', 
          xpReward: 250, 
          progress: 60 
        },
      ],
      leaderboard: [
        { id: 'user-2', name: 'Maria Santos', avatar: '👩', level: 15, xp: 3200, badges: 22, rankChange: 0 },
        { id: 'user-3', name: 'Pedro Lima', avatar: '👨', level: 14, xp: 3050, badges: 20, rankChange: 1 },
        { id: session.user?.id || 'user-1', name: session.user?.name || 'Você', avatar: '😎', level: 12, xp: 2450, badges: 18, rankChange: -1 },
        { id: 'user-4', name: 'Ana Costa', avatar: '👩‍💼', level: 11, xp: 2100, badges: 15, rankChange: 2 },
        { id: 'user-5', name: 'Carlos Souza', avatar: '👨‍💻', level: 10, xp: 1890, badges: 14, rankChange: 0 },
        { id: 'user-6', name: 'Lucas Ferreira', avatar: '🧑', level: 9, xp: 1650, badges: 12, rankChange: -2 },
        { id: 'user-7', name: 'Julia Mendes', avatar: '👩‍🦰', level: 8, xp: 1400, badges: 10, rankChange: 1 },
        { id: 'user-8', name: 'Bruno Silva', avatar: '🧔', level: 7, xp: 1200, badges: 8, rankChange: 0 },
      ],
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error('GET /api/strategic/achievements error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
