import { NextRequest } from 'next/server';
import { initializeFinancialModule } from '@/modules/financial/presentation/bootstrap';
import { PayablesController } from '@/modules/financial/presentation/controllers/PayablesController';

// Inicializar módulo
initializeFinancialModule();

interface RouteParams {
  params: { id: string };
}

/**
 * POST /api/v2/financial/payables/[id]/pay
 * Registrar pagamento
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  return PayablesController.pay(request, params);
}

