/**
 * API: GET/PUT /api/strategic/settings
 * Gerencia configurações do módulo Strategic
 * 
 * @module app/api/strategic/settings
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

interface StrategicSettings {
  appearance: {
    theme: 'dark' | 'light' | 'system';
    animations: boolean;
    density: 'compact' | 'comfortable' | 'spacious';
  };
  thresholds: {
    onTrack: number;
    atRisk: number;
  };
  notifications: {
    criticalAlerts: boolean;
    planDeadlines: boolean;
    deadlineDays: number;
    achievements: boolean;
    dailySummary: boolean;
    summaryTime: string;
    sound: boolean;
  };
  aurora: {
    autoInsights: boolean;
    detailLevel: 'summary' | 'detailed' | 'expert';
    language: string;
  };
  gamification: {
    enabled: boolean;
    publicRanking: boolean;
    weeklyChallenges: boolean;
  };
  warRoom: {
    autoRefresh: boolean;
    refreshInterval: number;
    defaultPage: string;
  };
}

const DEFAULT_SETTINGS: StrategicSettings = {
  appearance: { theme: 'dark', animations: true, density: 'comfortable' },
  thresholds: { onTrack: 80, atRisk: 50 },
  notifications: { 
    criticalAlerts: true, 
    planDeadlines: true, 
    deadlineDays: 3,
    achievements: true, 
    dailySummary: false, 
    summaryTime: '08:00', 
    sound: true 
  },
  aurora: { autoInsights: true, detailLevel: 'detailed', language: 'pt-BR' },
  gamification: { enabled: true, publicRanking: true, weeklyChallenges: true },
  warRoom: { autoRefresh: true, refreshInterval: 30, defaultPage: 'war-room' },
};

export const GET = withDI(async () => {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Buscar settings do usuário do banco via repository
    // const settingsRepo = container.resolve<IUserSettingsRepository>(STRATEGIC_TOKENS.UserSettingsRepository);
    // const settings = await settingsRepo.findByUserId(session.user.id);

    return NextResponse.json({
      settings: DEFAULT_SETTINGS,
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PUT = withDI(async (request: Request) => {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await request.json() as StrategicSettings;
    
    // Validações básicas
    if (settings.thresholds.onTrack < settings.thresholds.atRisk) {
      return NextResponse.json(
        { error: 'onTrack deve ser maior que atRisk' },
        { status: 400 }
      );
    }

    if (settings.warRoom.refreshInterval < 10 || settings.warRoom.refreshInterval > 120) {
      return NextResponse.json(
        { error: 'refreshInterval deve estar entre 10 e 120 segundos' },
        { status: 400 }
      );
    }

    // TODO: Salvar settings no banco via repository
    // const settingsRepo = container.resolve<IUserSettingsRepository>(STRATEGIC_TOKENS.UserSettingsRepository);
    // await settingsRepo.save(session.user.id, settings);

    logger.info('Saving strategic settings for user:', session.user?.id, settings);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('PUT /api/strategic/settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
