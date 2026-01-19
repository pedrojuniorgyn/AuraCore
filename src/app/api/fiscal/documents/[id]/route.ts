import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { IFiscalDocumentRepository } from '@/modules/fiscal/domain/ports/output/IFiscalDocumentRepository';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { isValidUUID } from '@/modules/fiscal/presentation/validators';
import { toFiscalDocumentResponseDTO } from '@/modules/fiscal/application/dtos';
import { initializeFiscalModule } from '@/modules/fiscal/infrastructure/bootstrap';

// Garantir DI registrado
initializeFiscalModule();

/**
 * GET /api/fiscal/documents/[id]
 * 
 * Busca um documento fiscal por ID
 * 
 * Multi-tenancy: ✅ organizationId + branchId
 * Validação: ✅ UUID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // 1. Contexto multi-tenant (OBRIGATÓRIO)
    const ctx = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);
    
    // 2. Validar ID
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({
        success: false,
        error: 'ID do documento inválido (deve ser UUID)'
      }, { status: 400 });
    }
    
    // 3. Buscar via repository (com branchId - multi-tenancy)
    const repository = container.resolve<IFiscalDocumentRepository>(
      TOKENS.FiscalDocumentRepository
    );
    
    const document = await repository.findById(
      id, 
      ctx.organizationId, 
      branchId // OBRIGATÓRIO - .cursorrules
    );
    
    // 4. Validar existência
    if (!document) {
      return NextResponse.json({
        success: false,
        error: 'Documento fiscal não encontrado'
      }, { status: 404 });
    }
    
    // 5. Retornar documento
    return NextResponse.json({
      success: true,
      data: toFiscalDocumentResponseDTO(document)
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (error instanceof Response) {
      return error;
    }
    
    console.error('[GET /api/fiscal/documents/[id]]', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao buscar documento fiscal',
      details: errorMessage
    }, { status: 500 });
  }
}
