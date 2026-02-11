import { NextRequest } from 'next/server';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { initializeFinancialModule } from '@/modules/financial/presentation/bootstrap';
import { PayablesController } from '@/modules/financial/presentation/controllers/PayablesController';

// Inicializar módulo
initializeFinancialModule();

/**
 * POST /api/v2/financial/payables/[id]/cancel
 * Cancelar conta a pagar
 */
export const POST = withDI(async (request: NextRequest, context: RouteContext) => {
  const { id } = await context.params;
  return PayablesController.cancel(request, { id });
});
