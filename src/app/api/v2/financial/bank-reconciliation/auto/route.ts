/**
 * API V2: Auto Bank Reconciliation
 * POST /api/v2/financial/bank-reconciliation/auto - Conciliação bancária automática
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { container } from '@/shared/infrastructure/di/container';
import { FINANCIAL_TOKENS } from '@/modules/financial/infrastructure/di/FinancialModule';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';

const autoReconcileSchema = z.object({
  bankAccountId: z.string().min(1, 'bankAccountId é obrigatório'),
  startDate: z.string().transform(v => new Date(v)),
  endDate: z.string().transform(v => new Date(v)),
  dryRun: z.boolean().optional().default(false),
  config: z.object({
    amountTolerance: z.number().positive().optional(),
    dateWindowDays: z.number().int().positive().optional(),
    minAutoMatchConfidence: z.number().min(0).max(1).optional(),
    enableFuzzyDescription: z.boolean().optional(),
  }).optional(),
});

export const POST = withDI(async (request: NextRequest) => {
  const ctx = await getTenantContext(request);
  const body = await request.json();

  const parsed = autoReconcileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validação falhou', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const useCase = container.resolve(FINANCIAL_TOKENS.AutoReconcileUseCase);
  const result = await useCase.execute({
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
    bankAccountId: parsed.data.bankAccountId,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    dryRun: parsed.data.dryRun,
    config: parsed.data.config,
    userId: ctx.userId,
  });

  if (Result.isFail(result)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value);
});
