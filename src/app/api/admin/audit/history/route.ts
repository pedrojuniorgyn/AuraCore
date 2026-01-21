/**
 * API: GET /api/admin/audit/history
 * 
 * Consulta histórico de auditoria de uma entidade.
 * 
 * Permissão: admin.audit
 * 
 * Query Parameters:
 * - entityType: Tipo de entidade (ex: 'fiscal_documents')
 * - entityId: ID da entidade
 * - limit: Limite de registros (default: 50)
 * - offset: Offset para paginação (default: 0)
 * - operation: Filtrar por operação (INSERT, UPDATE, DELETE)
 * - dateFrom: Data inicial (ISO)
 * - dateTo: Data final (ISO)
 * - changedBy: Filtrar por usuário
 * 
 * @example
 * GET /api/admin/audit/history?entityType=fiscal_documents&entityId=abc-123&limit=20
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [...],
 *   "total": 50,
 *   "pagination": { limit: 20, offset: 0 }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/api-guard';
import { auditService, AUDITABLE_ENTITIES, type AuditableEntity, type AuditOperation } from '@/shared/infrastructure/audit';

export async function GET(request: NextRequest) {
  return withPermission(request, 'admin.audit', async (_user, ctx) => {
    try {
      const { searchParams } = new URL(request.url);
      
      // Parâmetros obrigatórios
      const entityType = searchParams.get('entityType') as AuditableEntity;
      const entityId = searchParams.get('entityId');

      if (!entityType || !entityId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Parâmetros obrigatórios: entityType, entityId',
          },
          { status: 400 }
        );
      }

      // Validar entityType
      if (!AUDITABLE_ENTITIES.includes(entityType)) {
        return NextResponse.json(
          {
            success: false,
            error: `Tipo de entidade inválido. Válidos: ${AUDITABLE_ENTITIES.join(', ')}`,
          },
          { status: 400 }
        );
      }

      // Parâmetros opcionais
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);
      const operation = searchParams.get('operation') as AuditOperation | null;
      const dateFrom = searchParams.get('dateFrom');
      const dateTo = searchParams.get('dateTo');
      const changedBy = searchParams.get('changedBy');

      // Buscar histórico
      const records = await auditService.getAuditHistory({
        entityType,
        entityId,
        organizationId: ctx.organizationId,
        branchId: ctx.branchId ?? ctx.defaultBranchId ?? 0,
        limit: Math.min(limit, 100), // Max 100
        offset,
        operation: operation || undefined,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        changedBy: changedBy || undefined,
      });

      // Contar total
      const total = await auditService.countAuditRecords(
        entityType,
        entityId,
        ctx.organizationId,
        ctx.branchId ?? ctx.defaultBranchId ?? 0
      );

      return NextResponse.json({
        success: true,
        data: records,
        total,
        pagination: {
          limit,
          offset,
          hasMore: offset + records.length < total,
        },
      });
    } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
      console.error('[Audit History] Erro:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Falha ao consultar histórico de auditoria',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        },
        { status: 500 }
      );
    }
  });
}
