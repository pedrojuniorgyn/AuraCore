/**
 * API: Progresso do Onboarding
 * GET/PUT /api/strategic/onboarding/progress
 * 
 * @module api/strategic/onboarding
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

interface OnboardingProgress {
  userId: string;
  isTourCompleted: boolean;
  checklistProgress: Record<string, boolean>;
  xpEarned: number;
  badges: string[];
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * GET /api/strategic/onboarding/progress
 * Retorna progresso detalhado do onboarding
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Buscar do banco de dados
  const progress: OnboardingProgress = {
    userId: session.user.id,
    isTourCompleted: false,
    checklistProgress: {},
    xpEarned: 0,
    badges: [],
    startedAt: null,
    completedAt: null,
  };

  // Calcular percentual
  const checklistItems = [
    'complete-tour',
    'create-kpi',
    'set-target',
    'create-action-plan',
    'invite-member',
  ];
  
  const completedItems = checklistItems.filter(
    item => progress.checklistProgress[item]
  ).length;
  
  const percentComplete = Math.round((completedItems / checklistItems.length) * 100);

  return NextResponse.json({
    ...progress,
    percentComplete,
    totalItems: checklistItems.length,
    completedItems,
  });
}

/**
 * PUT /api/strategic/onboarding/progress
 * Atualiza progresso do onboarding
 */
export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updates = await request.json();

    // TODO: Salvar no banco de dados
    // Por enquanto, apenas confirma recebimento
    // O frontend usa localStorage como fonte primária
    
    return NextResponse.json({
      success: true,
      message: 'Progress updated',
      updates,
    });
  } catch (error) {
    console.error('Error updating onboarding progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
