import { NextRequest } from 'next/server';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { initializeFinancialModule } from '@/modules/financial/presentation/bootstrap';
import { PayablesController } from '@/modules/financial/presentation/controllers/PayablesController';

// Inicializar módulo
initializeFinancialModule();

/**
 * GET /api/v2/financial/payables/[id]
 * Buscar conta a pagar por ID
 */
export const GET = withDI(async (request: NextRequest, context: RouteContext) => {
  const { id } = await context.params;
  return PayablesController.getById(request, { id });
});
