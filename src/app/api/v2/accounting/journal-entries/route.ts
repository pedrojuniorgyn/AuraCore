import { NextRequest } from 'next/server';
import { initializeAccountingModule, JournalEntriesController } from '@/modules/accounting';

/**
 * POST /api/v2/accounting/journal-entries
 * Criar novo lançamento contábil
 */
export async function POST(request: NextRequest) {
  initializeAccountingModule();
  return JournalEntriesController.create(request);
}

/**
 * GET /api/v2/accounting/journal-entries
 * Listar lançamentos com filtros e paginação
 */
export async function GET(request: NextRequest) {
  initializeAccountingModule();
  return JournalEntriesController.list(request);
}

