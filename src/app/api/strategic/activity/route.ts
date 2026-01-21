/**
 * API: GET /api/strategic/activity
 * Retorna feed de atividades
 *
 * @module app/api/strategic/activity
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { ActivityItem, ActivityType } from '@/lib/comments/comment-types';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    // Suprimir warnings de variáveis não usadas
    void page;
    void limit;
    void entityType;
    void entityId;

    // TODO: Em produção, buscar atividades reais do banco
    // const activityService = container.resolve<IActivityService>(TOKENS.ActivityService);
    // const activities = await activityService.getActivities({
    //   organizationId: session.user.organizationId,
    //   entityType,
    //   entityId,
    //   page,
    //   limit,
    // });

    // Mock data para desenvolvimento
    const now = Date.now();
    const mockActivities: ActivityItem[] = [
      {
        id: 'act-1',
        type: 'comment_added' as ActivityType,
        actor: { id: 'user-2', name: 'Maria Santos', initials: 'MS' },
        action: 'comentou em',
        target: {
          type: 'kpi',
          id: 'kpi-1',
          name: 'Taxa de Entrega no Prazo (OTD)',
          url: '/strategic/kpis/kpi-1',
        },
        createdAt: new Date(now - 5 * 60 * 1000).toISOString(),
      },
      {
        id: 'act-2',
        type: 'kpi_updated' as ActivityType,
        actor: { id: 'user-1', name: 'João Silva', initials: 'JS' },
        action: 'atualizou valor de',
        target: {
          type: 'kpi',
          id: 'kpi-2',
          name: 'Margem Bruta',
          url: '/strategic/kpis/kpi-2',
        },
        metadata: { oldValue: 32.5, newValue: 33.8 },
        createdAt: new Date(now - 15 * 60 * 1000).toISOString(),
      },
      {
        id: 'act-3',
        type: 'task_completed' as ActivityType,
        actor: { id: 'user-3', name: 'Pedro Lima', initials: 'PL' },
        action: 'completou tarefa em',
        target: {
          type: 'action_plan',
          id: 'plan-1',
          name: 'Otimizar expedição',
          url: '/strategic/action-plans/plan-1',
        },
        createdAt: new Date(now - 30 * 60 * 1000).toISOString(),
      },
      {
        id: 'act-4',
        type: 'goal_created' as ActivityType,
        actor: { id: 'user-4', name: 'Ana Costa', initials: 'AC' },
        action: 'criou meta',
        target: {
          type: 'goal',
          id: 'goal-1',
          name: 'Q1 2026 - Vendas',
          url: '/strategic/goals/goal-1',
        },
        createdAt: new Date(now - 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'act-5',
        type: 'reaction_added' as ActivityType,
        actor: { id: 'user-5', name: 'Carlos Oliveira', initials: 'CO' },
        action: 'reagiu ao comentário de',
        target: {
          type: 'comment',
          id: 'comment-1',
          name: 'Maria Santos',
        },
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'act-6',
        type: 'action_plan_created' as ActivityType,
        actor: { id: 'user-1', name: 'João Silva', initials: 'JS' },
        action: 'criou plano',
        target: {
          type: 'action_plan',
          id: 'plan-2',
          name: 'Reduzir custos logísticos',
          url: '/strategic/action-plans/plan-2',
        },
        createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'act-7',
        type: 'pdca_phase_changed' as ActivityType,
        actor: { id: 'user-2', name: 'Sistema', initials: 'SY' },
        action: 'iniciou ciclo PDCA',
        target: {
          type: 'pdca',
          id: 'pdca-12',
          name: '#12 - Melhoria Contínua',
          url: '/strategic/pdca/pdca-12',
        },
        createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    // Simular paginação
    const hasMore = false;

    return NextResponse.json({
      activities: mockActivities,
      hasMore,
      total: mockActivities.length,
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/strategic/activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
