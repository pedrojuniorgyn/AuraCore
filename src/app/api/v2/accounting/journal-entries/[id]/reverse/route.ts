import { NextRequest } from 'next/server';
import { initializeAccountingModule, JournalEntriesController } from '@/modules/accounting';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v2/accounting/journal-entries/[id]/reverse
 * Estornar lançamento
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  initializeAccountingModule();
  const { id } = await params;
  return JournalEntriesController.reverse(request, { id });
}

