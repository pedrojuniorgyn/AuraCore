/**
 * API V2: Audit Trail
 * GET /api/v2/audit - Buscar logs de auditoria
 * GET /api/v2/audit?entityType=AccountPayable&entityId=xxx - Histórico de entidade
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { getTenantContext } from '@/lib/auth/context';
import type { IAuditLogger, AuditSearchFilters } from '@/shared/infrastructure/audit/IAuditLogger';

export const GET = withDI(async (request: NextRequest) => {
  const ctx = await getTenantContext(request);
  const { searchParams } = new URL(request.url);

  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');

  const auditLogger = container.resolve<IAuditLogger>(TOKENS.AuditLogger);

  // Se entityType + entityId fornecidos, retorna histórico daquela entidade
  if (entityType && entityId) {
    const limit = Number(searchParams.get('limit') ?? 50);
    const history = await auditLogger.getHistory(entityType, entityId, limit);
    return NextResponse.json({ items: history, total: history.length });
  }

  // Caso contrário, busca por filtros
  const filters: AuditSearchFilters = {
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
    entityType: entityType || undefined,
    operation: (searchParams.get('operation') as AuditSearchFilters['operation']) || undefined,
    userId: searchParams.get('userId') || undefined,
    startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
    endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    page: Number(searchParams.get('page') ?? 1),
    pageSize: Number(searchParams.get('pageSize') ?? 50),
  };

  const result = await auditLogger.search(filters);
  return NextResponse.json(result);
});
