/**
 * API: GET /api/fiscal/cte/summary
 * KPIs e estatísticas de CTe
 * 
 * @module app/api/fiscal/cte/summary
 * @see E8.3 - SSRM Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cteHeader } from '@/lib/db/schema';
import { eq, and, sql, count, isNull } from 'drizzle-orm';
import { getTenantContext } from '@/lib/auth/context';

interface CteSummary {
  total: number;
  draft: number;
  authorized: number;
  rejected: number;
  totalValue: number;
}

/**
 * GET /api/fiscal/cte/summary
 * 
 * Retorna KPIs de CTe:
 * - total: Total de CTes
 * - draft: Rascunhos
 * - authorized: Autorizados
 * - rejected: Rejeitados
 * - totalValue: Valor total
 */
export async function GET(_request: NextRequest) {
  try {
    const ctx = await getTenantContext();

    // Base conditions (multi-tenancy + soft delete - SCHEMA-003, SCHEMA-006)
    const baseConditions = and(
      eq(cteHeader.organizationId, ctx.organizationId),
      eq(cteHeader.branchId, ctx.branchId),
      isNull(cteHeader.deletedAt)
    );

    // Executar todas as queries em paralelo
    const [
      totalResult,
      draftResult,
      authorizedResult,
      rejectedResult,
      valueResult,
    ] = await Promise.all([
      // Total de CTes
      db
        .select({ count: count() })
        .from(cteHeader)
        .where(baseConditions),

      // Rascunhos
      db
        .select({ count: count() })
        .from(cteHeader)
        .where(and(
          baseConditions,
          eq(cteHeader.status, 'DRAFT')
        )),

      // Autorizados
      db
        .select({ count: count() })
        .from(cteHeader)
        .where(and(
          baseConditions,
          eq(cteHeader.status, 'AUTHORIZED')
        )),

      // Rejeitados
      db
        .select({ count: count() })
        .from(cteHeader)
        .where(and(
          baseConditions,
          eq(cteHeader.status, 'REJECTED')
        )),

      // Valor total
      db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${cteHeader.totalValue} AS DECIMAL(18,2))), 0)`,
        })
        .from(cteHeader)
        .where(baseConditions),
    ]);

    const summary: CteSummary = {
      total: totalResult[0]?.count ?? 0,
      draft: draftResult[0]?.count ?? 0,
      authorized: authorizedResult[0]?.count ?? 0,
      rejected: rejectedResult[0]?.count ?? 0,
      totalValue: parseFloat(valueResult[0]?.total ?? '0'),
    };

    return NextResponse.json(summary);
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('[CTe Summary] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch summary', details: message },
      { status: 500 }
    );
  }
}
