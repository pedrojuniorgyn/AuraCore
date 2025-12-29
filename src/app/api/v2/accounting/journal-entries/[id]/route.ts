import { NextRequest } from 'next/server';
import { initializeAccountingModule, JournalEntriesController } from '@/modules/accounting';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v2/accounting/journal-entries/[id]
 * Buscar lançamento por ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  initializeAccountingModule();
  const { id } = await params;
  return JournalEntriesController.getById(request, { id });
}

