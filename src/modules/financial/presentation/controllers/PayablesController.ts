import { container } from '@/shared/infrastructure/di/container';
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { CreatePayableUseCase } from '../../application/use-cases/CreatePayableUseCase';
import { PayAccountPayableUseCase } from '../../application/use-cases/PayAccountPayableUseCase';
import { CancelPayableUseCase } from '../../application/use-cases/CancelPayableUseCase';
import { ListPayablesUseCase } from '../../application/use-cases/ListPayablesUseCase';
import { GetPayableByIdUseCase } from '../../application/use-cases/GetPayableByIdUseCase';
import type { ExecutionContext } from '../../application/use-cases/BaseUseCase';
import { Result } from '@/shared/domain';

/**
 * Controller para Payables
 * 
 * Responsabilidades:
 * - Extrair dados do request
 * - Construir ExecutionContext
 * - Chamar Use Case
 * - Formatar response
 * 
 * Segue API Contract:
 * - Auth + Tenant Context obrigatórios
 * - Zod validation nos Use Cases
 * - HTTP status codes corretos
 */
export class PayablesController {

  /**
   * Extrai ExecutionContext do request
   */
  static async getContext(request: NextRequest): Promise<ExecutionContext> {
    const tenantCtx = await getTenantContext();
    
    if (!tenantCtx) {
      throw new Error('Unauthorized: No tenant context');
    }

    const branchId = resolveBranchIdOrThrow(request.headers, tenantCtx);

    return {
      userId: tenantCtx.userId,
      organizationId: tenantCtx.organizationId,
      branchId,
      isAdmin: tenantCtx.isAdmin ?? false,
    };
  }

  /**
   * POST /api/v2/financial/payables
   */
  static async create(request: NextRequest): Promise<NextResponse | Response> {
    try {
      const ctx = await PayablesController.getContext(request);
      const body = await request.json();

      const useCase = container.resolve(CreatePayableUseCase);
      const result = await useCase.execute(body, ctx);

      if (Result.isFail(result)) {
        return NextResponse.json(
          { error: result.error, code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }

      return NextResponse.json(result.value, { status: 201 });
    } catch (error) {
      return PayablesController.handleError(error);
    }
  }

  /**
   * GET /api/v2/financial/payables
   */
  static async list(request: NextRequest): Promise<NextResponse | Response> {
    try {
      const ctx = await PayablesController.getContext(request);
      const { searchParams } = new URL(request.url);

      const input = {
        supplierId: searchParams.get('supplierId') 
          ? parseInt(searchParams.get('supplierId')!) 
          : undefined,
        status: searchParams.get('status') as ('PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'OVERDUE') | undefined,
        dueDateFrom: searchParams.get('dueDateFrom') ?? undefined,
        dueDateTo: searchParams.get('dueDateTo') ?? undefined,
        search: searchParams.get('search') ?? undefined,
        page: parseInt(searchParams.get('page') ?? '1'),
        pageSize: parseInt(searchParams.get('pageSize') ?? '20'),
        sortBy: (searchParams.get('sortBy') as 'dueDate' | 'amount' | 'createdAt' | 'documentNumber' | undefined) ?? undefined,
        sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'desc',
      };

      const useCase = container.resolve(ListPayablesUseCase);
      const result = await useCase.execute(input, ctx);

      if (Result.isFail(result)) {
        return NextResponse.json(
          { error: result.error, code: 'QUERY_ERROR' },
          { status: 400 }
        );
      }

      return NextResponse.json(result.value);
    } catch (error) {
      return PayablesController.handleError(error);
    }
  }

  /**
   * GET /api/v2/financial/payables/[id]
   */
  static async getById(
    request: NextRequest, 
    params: { id: string }
  ): Promise<NextResponse | Response> {
    try {
      const ctx = await PayablesController.getContext(request);

      const useCase = container.resolve(GetPayableByIdUseCase);
      const result = await useCase.execute({ payableId: params.id }, ctx);

      if (Result.isFail(result)) {
        const status = result.error.includes('not found') ? 404 : 400;
        return NextResponse.json(
          { error: result.error, code: status === 404 ? 'NOT_FOUND' : 'ERROR' },
          { status }
        );
      }

      return NextResponse.json(result.value);
    } catch (error) {
      return PayablesController.handleError(error);
    }
  }

  /**
   * POST /api/v2/financial/payables/[id]/pay
   */
  static async pay(
    request: NextRequest, 
    params: { id: string }
  ): Promise<NextResponse | Response> {
    try {
      const ctx = await PayablesController.getContext(request);
      const body = await request.json();

      const input = {
        payableId: params.id,
        ...body,
      };

      const useCase = container.resolve(PayAccountPayableUseCase);
      const result = await useCase.execute(input, ctx);

      if (Result.isFail(result)) {
        const status = result.error.includes('not found') ? 404 : 400;
        return NextResponse.json(
          { error: result.error, code: status === 404 ? 'NOT_FOUND' : 'PAYMENT_ERROR' },
          { status }
        );
      }

      return NextResponse.json(result.value);
    } catch (error) {
      return PayablesController.handleError(error);
    }
  }

  /**
   * POST /api/v2/financial/payables/[id]/cancel
   */
  static async cancel(
    request: NextRequest, 
    params: { id: string }
  ): Promise<NextResponse | Response> {
    try {
      const ctx = await PayablesController.getContext(request);
      const body = await request.json();

      const input = {
        payableId: params.id,
        reason: body.reason,
      };

      const useCase = container.resolve(CancelPayableUseCase);
      const result = await useCase.execute(input, ctx);

      if (Result.isFail(result)) {
        const status = result.error.includes('not found') ? 404 : 400;
        return NextResponse.json(
          { error: result.error, code: status === 404 ? 'NOT_FOUND' : 'CANCEL_ERROR' },
          { status }
        );
      }

      return NextResponse.json(result.value);
    } catch (error) {
      return PayablesController.handleError(error);
    }
  }

  /**
   * Handler de erros centralizado
   */
  private static handleError(error: unknown): NextResponse | Response {
    // CRÍTICO: Preservar NextResponse/Response já formatados
    // getTenantContext e resolveBranchIdOrThrow podem lançar NextResponse
    if (error instanceof Response) {
      return error;
    }

    console.error('[PayablesController] Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }

      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { error: error.message, code: 'FORBIDDEN' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

