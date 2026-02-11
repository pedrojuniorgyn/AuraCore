/**
 * API Routes: /api/strategic/alerts
 * GET - Lista alertas pendentes
 * POST - Executa verificações de alertas
 *
 * @module app/api/strategic
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { AlertService, type PartialAlertConfig } from '@/modules/strategic/application/services/AlertService';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IAlertRepository } from '@/modules/strategic/domain/ports/output/IAlertRepository';

import { logger } from '@/shared/infrastructure/logging';
const runAlertsSchema = z.object({
  config: z.object({
    kpiCriticalThreshold: z.number().min(0).max(100).optional(),
    kpiWarningThreshold: z.number().min(0).max(100).optional(),
    varianceUnfavorableThreshold: z.number().min(0).max(100).optional(),
    overdueDaysWarning: z.number().int().min(1).optional(),
    overdueDaysCritical: z.number().int().min(1).optional(),
    staleDaysThreshold: z.number().int().min(1).optional(),
  }).optional(),
});

/**
 * GET /api/strategic/alerts
 * Lista alertas pendentes
 */
export const GET = withDI(async () => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alertRepository = container.resolve<IAlertRepository>(
      STRATEGIC_TOKENS.AlertRepository
    );

    const alerts = await alertRepository.findPending(
      context.organizationId,
      context.branchId
    );

    return NextResponse.json({
      success: true,
      data: alerts.map((alert) => ({
        id: alert.id,
        alertType: alert.alertType,
        severity: alert.severity,
        entityType: alert.entityType,
        entityId: alert.entityId,
        entityName: alert.entityName,
        title: alert.title,
        message: alert.message,
        currentValue: alert.currentValue,
        thresholdValue: alert.thresholdValue,
        status: alert.status,
        createdAt: alert.createdAt,
      })),
      count: alerts.length,
    });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/strategic/alerts
 * Executa verificações de alertas e cria novos alertas
 */
export const POST = withDI(async (request: Request) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = runAlertsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const alertService = container.resolve<AlertService>(
      STRATEGIC_TOKENS.AlertService
    );

    // Config pode ser undefined ou um objeto parcial - será mesclado com defaults no service
    const config: PartialAlertConfig | undefined = parsed.data.config;

    const result = await alertService.runAllChecks(
      context.organizationId,
      context.branchId,
      config
    );

    if (!Result.isOk(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        alertsCreated: result.value.created,
        alerts: result.value.alerts.map((alert) => ({
          id: alert.id,
          type: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          entityType: alert.entityType,
          entityId: alert.entityId,
          message: alert.message,
        })),
      },
    });
  } catch (error) {
    logger.error('Error running alert checks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
