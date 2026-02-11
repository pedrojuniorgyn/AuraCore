/**
 * API: GET /api/admin/retention/policies
 * 
 * Lista políticas de retenção de dados.
 * 
 * Permissão: admin.retention
 * 
 * @example
 * GET /api/admin/retention/policies
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "...",
 *       "policyName": "slow_logs",
 *       "tableName": "request_logs",
 *       "retentionDays": 30,
 *       ...
 *     }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/api-guard';
import { retentionService } from '@/shared/infrastructure/retention';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const GET = withDI(async (request: NextRequest) => {
  return withPermission(request, 'admin.retention', async () => {
    try {
      const policies = await retentionService.listPolicies();

      return NextResponse.json({
        success: true,
        data: policies,
        total: policies.length,
      });
    } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
      logger.error('[Retention Policies] Erro ao listar:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Falha ao listar políticas',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        },
        { status: 500 }
      );
    }
  });
});
