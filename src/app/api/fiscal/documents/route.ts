import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { CreateFiscalDocumentUseCase } from '@/modules/fiscal/application/use-cases';
import { IFiscalDocumentRepository } from '@/modules/fiscal/domain/ports/output/IFiscalDocumentRepository';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { Result } from '@/shared/domain';
import { 
  CreateFiscalDocumentSchema, 
  ListFiscalDocumentsQuerySchema,
  getHttpStatusFromError 
} from '@/modules/fiscal/presentation/validators';
import { toFiscalDocumentResponseDTO } from '@/modules/fiscal/application/dtos';
import { initializeFiscalModule } from '@/modules/fiscal/infrastructure/bootstrap';

// Garantir DI registrado (idempotente - seguro chamar múltiplas vezes)
initializeFiscalModule();

/**
 * POST /api/fiscal/documents
 * 
 * Cria um novo documento fiscal (NFE, CTE, MDFE, NFSE)
 * 
 * Multi-tenancy: ✅ organizationId + branchId
 * Validação: ✅ Zod schema
 * DDD: ✅ Use Case
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Contexto multi-tenant (OBRIGATÓRIO)
    const ctx = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);
    
    // 2. Validar body com Zod (OBRIGATÓRIO)
    const body = await request.json();
    const validationResult = CreateFiscalDocumentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.issues
      }, { status: 400 });
    }
    
    // 3. Executar Use Case
    const useCase = container.resolve(CreateFiscalDocumentUseCase);
    const result = await useCase.execute(validationResult.data, {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId
    });
    
    // 4. Retornar resultado
    if (Result.isFail(result)) {
      const status = getHttpStatusFromError(result.error);
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status });
    }
    
    return NextResponse.json({
      success: true,
      data: result.value
    }, { status: 201 });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Se for erro de autenticação (getTenantContext lança Response)
    if (error instanceof Response) {
      return error;
    }
    
    console.error('[POST /api/fiscal/documents]', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao criar documento fiscal',
      details: errorMessage
    }, { status: 500 });
  }
}

/**
 * GET /api/fiscal/documents
 * 
 * Lista documentos fiscais com filtros e paginação
 * 
 * Multi-tenancy: ✅ organizationId + branchId (OBRIGATÓRIO)
 * Paginação: ✅ page, limit
 * Filtros: status, documentType, issueDateFrom, issueDateTo
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Contexto multi-tenant (OBRIGATÓRIO)
    const ctx = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);
    
    // 2. Validar query params
    const { searchParams } = new URL(request.url);
    const queryValidation = ListFiscalDocumentsQuerySchema.safeParse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      status: searchParams.get('status') || undefined,
      documentType: searchParams.get('documentType') || undefined,
      issueDateFrom: searchParams.get('issueDateFrom') || undefined,
      issueDateTo: searchParams.get('issueDateTo') || undefined,
    });
    
    if (!queryValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetros de consulta inválidos',
        details: queryValidation.error.issues
      }, { status: 400 });
    }
    
    const { page, limit, status, documentType, issueDateFrom, issueDateTo } = queryValidation.data;
    
    // 3. Buscar via repository
    const repository = container.resolve<IFiscalDocumentRepository>(
      TOKENS.FiscalDocumentRepository
    );
    
    const filter = {
      organizationId: ctx.organizationId,
      branchId, // OBRIGATÓRIO - .cursorrules
      ...(status && { status: [status as unknown as import('@/modules/fiscal/domain/value-objects/DocumentType').DocumentStatus] }),
      ...(documentType && { documentType: [documentType as unknown as import('@/modules/fiscal/domain/value-objects/DocumentType').DocumentType] }),
      ...(issueDateFrom && { issueDateFrom: new Date(issueDateFrom) }),
      ...(issueDateTo && { issueDateTo: new Date(issueDateTo) }),
    };
    
    const result = await repository.findMany(filter, { page, pageSize: limit });
    
    // 4. Retornar resultado paginado
    return NextResponse.json({
      success: true,
      data: result.data.map(doc => toFiscalDocumentResponseDTO(doc)),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (error instanceof Response) {
      return error;
    }
    
    console.error('[GET /api/fiscal/documents]', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao listar documentos fiscais',
      details: errorMessage
    }, { status: 500 });
  }
}
