/**
 * API V2: Journal Entries (Lançamentos Contábeis)
 * GET /api/v2/accounting/journal-entries - Listar lançamentos
 * POST /api/v2/accounting/journal-entries - Criar lançamento
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';

const createEntrySchema = z.object({
  entryDate: z.string().transform(v => new Date(v)),
  description: z.string().min(1).max(500),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
  lines: z.array(z.object({
    chartAccountId: z.string().min(1),
    debitAmount: z.number().min(0).default(0),
    creditAmount: z.number().min(0).default(0),
    description: z.string().optional(),
    partnerId: z.string().optional(),
    costCenterId: z.string().optional(),
  })).min(2, 'Mínimo 2 linhas para partida dobrada'),
  autoPost: z.boolean().optional().default(false),
});

export const GET = withDI(async (request: NextRequest) => {
  const ctx = await getTenantContext(request);
  const { searchParams } = new URL(request.url);

  const useCase = container.resolve(TOKENS.ListJournalEntriesUseCase);
  const result = await useCase.execute({
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
    status: searchParams.get('status') || undefined,
    sourceType: searchParams.get('sourceType') || undefined,
    startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
    endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    page: Number(searchParams.get('page') ?? 1),
    pageSize: Number(searchParams.get('pageSize') ?? 50),
  });

  if (Result.isFail(result)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value);
});

export const POST = withDI(async (request: NextRequest) => {
  const ctx = await getTenantContext(request);
  const body = await request.json();

  const parsed = createEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validação falhou', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Validar partida dobrada
  const totalDebit = parsed.data.lines.reduce((sum, l) => sum + l.debitAmount, 0);
  const totalCredit = parsed.data.lines.reduce((sum, l) => sum + l.creditAmount, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return NextResponse.json(
      { error: `Partida dobrada inválida: débito (${totalDebit.toFixed(2)}) != crédito (${totalCredit.toFixed(2)})` },
      { status: 400 }
    );
  }

  const useCase = container.resolve(TOKENS.CreateJournalEntryUseCase);
  const result = await useCase.execute({
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
    userId: ctx.userId,
    entryDate: parsed.data.entryDate,
    description: parsed.data.description,
    sourceType: parsed.data.sourceType,
    sourceId: parsed.data.sourceId,
    lines: parsed.data.lines,
    autoPost: parsed.data.autoPost,
  });

  if (Result.isFail(result)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value, { status: 201 });
});
