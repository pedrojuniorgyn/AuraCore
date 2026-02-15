/**
 * API: GET /api/fiscal/documents/summary
 * KPIs e estatísticas de Documentos Fiscais
 * 
 * @module app/api/fiscal/documents/summary
 * @see E8.3 - SSRM Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { db } from '@/lib/db';
import { inboundInvoices } from '@/lib/db/schema';
// NOTE: inboundInvoices é cross-module (não-fiscal), mantido em @/lib/db/schema
import { eq, and, sql, count } from 'drizzle-orm';
import { getTenantContext } from '@/lib/auth/context';

import { logger } from '@/shared/infrastructure/logging';
interface FiscalDocumentSummary {
  total: number;
  pending: number;
  classified: number;
  posted: number;
  totalValue: number;
}

/**
 * GET /api/fiscal/documents/summary
 * 
 * Retorna KPIs de documentos fiscais:
 * - total: Total de documentos
 * - pending: Pendentes de classificação
 * - classified: Classificados
 * - posted: Processados/Importados com sucesso
 * - totalValue: Valor total (soma de totalNfe)
 */
export const GET = withDI(async (_request: NextRequest) => {
  try {
    const ctx = await getTenantContext();

    // Base conditions (multi-tenancy - SCHEMA-003)
    const baseConditions = and(
      eq(inboundInvoices.organizationId, ctx.organizationId),
      eq(inboundInvoices.branchId, ctx.branchId)
    );

    // Executar todas as queries em paralelo
    const [
      totalResult,
      pendingResult,
      classifiedResult,
      postedResult,
      valueResult,
    ] = await Promise.all([
      // Total de documentos
      db
        .select({ count: count() })
        .from(inboundInvoices)
        .where(baseConditions),

      // Pendentes de classificação
      db
        .select({ count: count() })
        .from(inboundInvoices)
        .where(and(
          baseConditions,
          eq(inboundInvoices.status, 'PENDING_CLASSIFICATION')
        )),

      // Classificados
      db
        .select({ count: count() })
        .from(inboundInvoices)
        .where(and(
          baseConditions,
          eq(inboundInvoices.status, 'CLASSIFIED')
        )),

      // Processados/Importados (status = IMPORTED indica processamento concluído)
      db
        .select({ count: count() })
        .from(inboundInvoices)
        .where(and(
          baseConditions,
          eq(inboundInvoices.status, 'IMPORTED')
        )),

      // Valor total
      db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${inboundInvoices.totalNfe} AS DECIMAL(18,2))), 0)`,
        })
        .from(inboundInvoices)
        .where(baseConditions),
    ]);

    const summary: FiscalDocumentSummary = {
      total: totalResult[0]?.count ?? 0,
      pending: pendingResult[0]?.count ?? 0,
      classified: classifiedResult[0]?.count ?? 0,
      posted: postedResult[0]?.count ?? 0,
      totalValue: parseFloat(valueResult[0]?.total ?? '0'),
    };

    return NextResponse.json(summary);
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('[Fiscal Documents Summary] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch summary', details: message },
      { status: 500 }
    );
  }
});
