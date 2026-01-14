import { NextRequest } from 'next/server';
import { initializeFinancialModule } from '@/modules/financial/presentation/bootstrap';
import { PayablesController } from '@/modules/financial/presentation/controllers/PayablesController';

// Inicializar módulo
initializeFinancialModule();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v2/financial/payables/[id]/cancel
 * Cancelar conta a pagar
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return PayablesController.cancel(request, { id });
}

