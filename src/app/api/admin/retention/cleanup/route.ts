/**
 * API: POST /api/admin/retention/cleanup
 * 
 * Executa políticas de retenção de dados.
 * Remove dados temporários que excederam o período de retenção.
 * 
 * Permissão: admin.retention
 * 
 * @example
 * POST /api/admin/retention/cleanup
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "policiesExecuted": 4,
 *     "totalDeleted": 1500,
 *     "failures": 0,
 *     "results": [...],
 *     "totalDurationMs": 234,
 *     "executedAt": "2026-01-20T12:00:00.000Z"
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/api-guard';
import { retentionService } from '@/shared/infrastructure/retention';

export async function POST(request: NextRequest) {
  return withPermission(request, 'admin.retention', async (_user, ctx) => {
    try {
      console.log(`[Retention Cleanup] Iniciado por userId=${ctx.userId}`);

      const summary = await retentionService.runCleanup();

      console.log(
        `[Retention Cleanup] Concluído: ${summary.totalDeleted} registros deletados em ${summary.totalDurationMs}ms`
      );

      return NextResponse.json({
        success: true,
        data: summary,
      });
    } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
      console.error('[Retention Cleanup] Erro:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Falha ao executar cleanup',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        },
        { status: 500 }
      );
    }
  });
}
