import { NextRequest } from 'next/server';
import { PayablesController } from '@/modules/financial/presentation/controllers/PayablesController';
import { withDI } from '@/shared/infrastructure/di/with-di';

// Inicializar módulo
/**
 * POST /api/v2/financial/payables
 * Criar conta a pagar
 */
export const POST = withDI(async (request: NextRequest) => {
  return PayablesController.create(request);
});

/**
 * GET /api/v2/financial/payables
 * Listar contas a pagar com filtros e paginação
 */
export const GET = withDI(async (request: NextRequest) => {
  return PayablesController.list(request);
});

