import { NextRequest } from 'next/server';
import { initializeFinancialModule } from '@/modules/financial/presentation/bootstrap';
import { PayablesController } from '@/modules/financial/presentation/controllers/PayablesController';

// Inicializar módulo
initializeFinancialModule();

/**
 * POST /api/v2/financial/payables
 * Criar conta a pagar
 */
export async function POST(request: NextRequest) {
  return PayablesController.create(request);
}

/**
 * GET /api/v2/financial/payables
 * Listar contas a pagar com filtros e paginação
 */
export async function GET(request: NextRequest) {
  return PayablesController.list(request);
}

