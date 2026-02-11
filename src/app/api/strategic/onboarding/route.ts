/**
 * API: Onboarding do Strategic
 * GET/POST /api/strategic/onboarding
 * 
 * @module api/strategic/onboarding
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * GET /api/strategic/onboarding
 * Retorna estado do onboarding do usuário
 */
export const GET = withDI(async () => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Buscar progresso do usuário do banco
  // Por enquanto, retorna dados default (frontend usa localStorage)
  return NextResponse.json({
    isTourCompleted: false,
    checklistProgress: {},
    completedAt: null,
    xpEarned: 0,
    badges: [],
  });
});

/**
 * POST /api/strategic/onboarding
 * Registra ações do onboarding (tour completo, items do checklist)
 */
export const POST = withDI(async (request: Request) => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, data } = await request.json();

    // TODO: Salvar progresso no banco e integrar com sistema de gamificação
    switch (action) {
      case 'complete-tour':
        // Dar XP e badge de explorador
        return NextResponse.json({ 
          success: true, 
          xpEarned: 50, 
          badge: {
            id: 'explorer',
            name: 'Explorador',
            description: 'Completou o tour inicial',
            icon: '🧭',
          },
        });
      
      case 'complete-checklist-item':
        // Marcar item como completo e dar XP
        return NextResponse.json({ 
          success: true, 
          xpEarned: 10,
          itemId: data?.itemId,
        });
      
      case 'skip-tour':
        return NextResponse.json({ success: true });
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error processing onboarding action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
