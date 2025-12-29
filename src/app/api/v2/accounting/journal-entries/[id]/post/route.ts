import { NextRequest } from 'next/server';
import { initializeAccountingModule, JournalEntriesController } from '@/modules/accounting';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v2/accounting/journal-entries/[id]/post
 * Postar lançamento (DRAFT → POSTED)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  initializeAccountingModule();
  const { id } = await params;
  return JournalEntriesController.post(request, { id });
}

