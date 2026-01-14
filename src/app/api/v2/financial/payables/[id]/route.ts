import { NextRequest } from 'next/server';
import { initializeFinancialModule } from '@/modules/financial/presentation/bootstrap';
import { PayablesController } from '@/modules/financial/presentation/controllers/PayablesController';

// Inicializar módulo
initializeFinancialModule();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v2/financial/payables/[id]
 * Buscar conta a pagar por ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return PayablesController.getById(request, { id });
}

