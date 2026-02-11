/**
 * API: POST /api/integrations/slack/notify
 * Envia notificação para Slack usando o service DDD
 * 
 * @module app/api/integrations/slack
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import { SlackNotificationService } from '@/modules/strategic/application/services/integrations/SlackNotificationService';
import { Result } from '@/shared/domain';
import type { IntegrationEventType } from '@/lib/integrations/integration-types';

import { logger } from '@/shared/infrastructure/logging';
const NotifySchema = z.object({
  webhookUrl: z.string().url().startsWith('https://hooks.slack.com/'),
  eventType: z.enum([
    'kpi.critical',
    'kpi.warning',
    'kpi.updated',
    'kpi.target_achieved',
    'action_plan.created',
    'action_plan.overdue',
    'action_plan.completed',
    'action_plan.status_changed',
    'goal.achieved',
    'goal.progress_updated',
    'pdca.phase_changed',
    'pdca.completed',
    'report.generated',
    'comment.created',
    'mention.received',
    'achievement.unlocked',
  ]),
  data: z.record(z.string(), z.unknown()),
  messageFormat: z.enum(['compact', 'detailed', 'rich']).optional(),
});

// Schema para notificações específicas
const NotifyKPICriticalSchema = z.object({
  webhookUrl: z.string().url(),
  kpiId: z.string().uuid(),
});

const NotifyActionPlanOverdueSchema = z.object({
  webhookUrl: z.string().url(),
  actionPlanId: z.string().uuid(),
});

export const POST = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Resolver service
    const service = container.resolve<SlackNotificationService>(
      STRATEGIC_TOKENS.SlackNotificationService
    );

    // Processar baseado na ação
    if (action === 'kpi-critical') {
      // Notificação específica de KPI crítico
      const body = await request.json();
      const validation = NotifyKPICriticalSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Input inválido', details: validation.error.issues },
          { status: 400 }
        );
      }

      const result = await service.notifyKPICritical(
        validation.data.kpiId,
        validation.data.webhookUrl,
        context.organizationId,
        context.branchId
      );

      if (Result.isFail(result)) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json(result.value);
    }

    if (action === 'action-plan-overdue') {
      // Notificação específica de plano atrasado
      const body = await request.json();
      const validation = NotifyActionPlanOverdueSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Input inválido', details: validation.error.issues },
          { status: 400 }
        );
      }

      const result = await service.notifyActionPlanOverdue(
        validation.data.actionPlanId,
        validation.data.webhookUrl,
        context.organizationId,
        context.branchId
      );

      if (Result.isFail(result)) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json(result.value);
    }

    // Notificação genérica
    const body = await request.json();
    const validation = NotifySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Input inválido', details: validation.error.issues },
        { status: 400 }
      );
    }

    const result = await service.sendNotification({
      webhookUrl: validation.data.webhookUrl,
      eventType: validation.data.eventType as IntegrationEventType,
      data: validation.data.data,
      messageFormat: validation.data.messageFormat,
    });

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.value);
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('POST /api/integrations/slack/notify error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});

// Enable dynamic rendering
export const dynamic = 'force-dynamic';
