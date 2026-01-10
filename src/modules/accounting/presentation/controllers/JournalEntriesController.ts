import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { Result } from '@/shared/domain';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { ExecutionContext } from '../../application/use-cases/BaseUseCase';
import { CreateJournalEntryUseCase } from '../../application/use-cases/CreateJournalEntryUseCase';
import { ListJournalEntriesUseCase } from '../../application/use-cases/ListJournalEntriesUseCase';
import { GetJournalEntryByIdUseCase } from '../../application/use-cases/GetJournalEntryByIdUseCase';
import { AddLineToEntryUseCase } from '../../application/use-cases/AddLineToEntryUseCase';
import { PostJournalEntryUseCase } from '../../application/use-cases/PostJournalEntryUseCase';
import { ReverseJournalEntryUseCase } from '../../application/use-cases/ReverseJournalEntryUseCase';

/**
 * Controller para Journal Entries
 */
export class JournalEntriesController {

  /**
   * Extrai contexto de execução do request
   */
  private static async getContext(request: NextRequest): Promise<ExecutionContext> {
    const tenantCtx = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, tenantCtx);

    return {
      userId: tenantCtx.userId,
      organizationId: tenantCtx.organizationId,
      branchId,
      isAdmin: tenantCtx.isAdmin,
    };
  }

  /**
   * POST /api/v2/accounting/journal-entries
   * Criar novo lançamento contábil
   */
  static async create(request: NextRequest): Promise<NextResponse | Response> {
    try {
      const ctx = await JournalEntriesController.getContext(request);
      const body = await request.json();

      const useCase = container.resolve(CreateJournalEntryUseCase);
      const result = await useCase.execute(body, ctx);

      if (Result.isFail(result)) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json(result.value, { status: 201 });
    } catch (error) {
      return JournalEntriesController.handleError(error);
    }
  }

  /**
   * GET /api/v2/accounting/journal-entries
   * Listar lançamentos com filtros e paginação
   */
  static async list(request: NextRequest): Promise<NextResponse | Response> {
    try {
      const ctx = await JournalEntriesController.getContext(request);
      const { searchParams } = new URL(request.url);

      // Extrair query params
      const input = {
        status: searchParams.getAll('status'),
        source: searchParams.getAll('source'),
        periodYear: searchParams.get('periodYear') 
          ? parseInt(searchParams.get('periodYear')!) 
          : undefined,
        periodMonth: searchParams.get('periodMonth') 
          ? parseInt(searchParams.get('periodMonth')!) 
          : undefined,
        entryDateFrom: searchParams.get('entryDateFrom') ?? undefined,
        entryDateTo: searchParams.get('entryDateTo') ?? undefined,
        search: searchParams.get('search') ?? undefined,
        page: parseInt(searchParams.get('page') ?? '1'),
        pageSize: parseInt(searchParams.get('pageSize') ?? '20'),
        sortBy: searchParams.get('sortBy') ?? undefined,
        sortOrder: (searchParams.get('sortOrder') ?? 'desc') as 'asc' | 'desc',
      };

      const useCase = container.resolve(ListJournalEntriesUseCase);
      const result = await useCase.execute(input, ctx);

      if (Result.isFail(result)) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json(result.value);
    } catch (error) {
      return JournalEntriesController.handleError(error);
    }
  }

  /**
   * GET /api/v2/accounting/journal-entries/[id]
   * Buscar lançamento por ID
   */
  static async getById(
    request: NextRequest,
    params: { id: string }
  ): Promise<NextResponse | Response> {
    try {
      const ctx = await JournalEntriesController.getContext(request);

      const useCase = container.resolve(GetJournalEntryByIdUseCase);
      const result = await useCase.execute({ id: params.id }, ctx);

      if (Result.isFail(result)) {
        const status = result.error.includes('not found') ? 404 : 400;
        return NextResponse.json(
          { error: result.error },
          { status }
        );
      }

      return NextResponse.json(result.value);
    } catch (error) {
      return JournalEntriesController.handleError(error);
    }
  }

  /**
   * POST /api/v2/accounting/journal-entries/[id]/lines
   * Adicionar linha ao lançamento
   */
  static async addLine(
    request: NextRequest,
    params: { id: string }
  ): Promise<NextResponse | Response> {
    try {
      const ctx = await JournalEntriesController.getContext(request);
      const body = await request.json();

      const useCase = container.resolve(AddLineToEntryUseCase);
      const result = await useCase.execute(
        { ...body, journalEntryId: params.id },
        ctx
      );

      if (Result.isFail(result)) {
        const status = result.error.includes('not found') ? 404 : 400;
        return NextResponse.json(
          { error: result.error },
          { status }
        );
      }

      return NextResponse.json(result.value, { status: 201 });
    } catch (error) {
      return JournalEntriesController.handleError(error);
    }
  }

  /**
   * POST /api/v2/accounting/journal-entries/[id]/post
   * Postar lançamento (DRAFT → POSTED)
   */
  static async post(
    request: NextRequest,
    params: { id: string }
  ): Promise<NextResponse | Response> {
    try {
      const ctx = await JournalEntriesController.getContext(request);

      const useCase = container.resolve(PostJournalEntryUseCase);
      const result = await useCase.execute(
        { journalEntryId: params.id },
        ctx
      );

      if (Result.isFail(result)) {
        const status = result.error.includes('not found') ? 404 : 400;
        return NextResponse.json(
          { error: result.error },
          { status }
        );
      }

      return NextResponse.json(result.value);
    } catch (error) {
      return JournalEntriesController.handleError(error);
    }
  }

  /**
   * POST /api/v2/accounting/journal-entries/[id]/reverse
   * Estornar lançamento
   */
  static async reverse(
    request: NextRequest,
    params: { id: string }
  ): Promise<NextResponse | Response> {
    try {
      const ctx = await JournalEntriesController.getContext(request);
      const body = await request.json();

      const useCase = container.resolve(ReverseJournalEntryUseCase);
      const result = await useCase.execute(
        { journalEntryId: params.id, reason: body.reason, ...ctx }
      );

      if (Result.isFail(result)) {
        const errorMessage = result.error instanceof Error ? result.error.message : String(result.error);
        const status = errorMessage.includes('not found') ? 404 : 400;
        return NextResponse.json(
          { error: errorMessage },
          { status }
        );
      }

      return NextResponse.json(result.value);
    } catch (error) {
      return JournalEntriesController.handleError(error);
    }
  }

  /**
   * Handler de erros centralizado
   * IMPORTANTE: Preservar Response/NextResponse lançados por getTenantContext/resolveBranchIdOrThrow
   */
  private static handleError(error: unknown): NextResponse | Response {
    // Preservar Response lançados por auth/branch helpers
    if (error instanceof Response) {
      return error;
    }

    if (error instanceof Error) {
      // Erros conhecidos de auth
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }

      // Erro genérico
      console.error('[JournalEntriesController] Error:', error.message);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    console.error('[JournalEntriesController] Unknown error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

