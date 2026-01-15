/**
 * 📄 SPED FISCAL GENERATION API ROUTE
 * 
 * POST /api/sped/fiscal/generate
 * Gera arquivo SPED Fiscal (EFD-ICMS/IPI) usando arquitetura DDD/Hexagonal
 * 
 * @epic E7.18 - Migração SPED para Input Ports + Use Cases
 * @layer Presentation
 */

import { NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { auth } from '@/lib/auth';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IGenerateSpedFiscal } from '@/modules/fiscal/domain/ports/input';

// Garantir que módulo está inicializado
import '@/modules/fiscal/infrastructure/bootstrap';

/**
 * POST /api/sped/fiscal/generate
 * 
 * Body: {
 *   competencia: string;  // Formato MMAAAA (ex: 012026)
 *   finalidade?: "ORIGINAL" | "RETIFICADORA" | "SUBSTITUTA";
 *   hashRetificado?: string; // Obrigatório se finalidade != ORIGINAL
 * }
 * 
 * Response: Arquivo .txt com encoding ISO-8859-1
 */
export async function POST(req: Request) {
  try {
    // 1. Autenticação
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Contexto multi-tenancy
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Contexto não disponível' }, { status: 401 });
    }

    // 3. Parse body
    const body = await req.json();
    const { competencia, finalidade = 'ORIGINAL', hashRetificado } = body;

    // 4. Validações
    if (!competencia) {
      return NextResponse.json(
        { error: 'competencia é obrigatória (formato MMAAAA)' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(competencia)) {
      return NextResponse.json(
        { error: 'competencia deve estar no formato MMAAAA (ex: 012026)' },
        { status: 400 }
      );
    }

    // 5. Validar branchId
    if (ctx.defaultBranchId === null || ctx.defaultBranchId === undefined) {
      return NextResponse.json(
        { error: 'Branch não configurado para este usuário' },
        { status: 400 }
      );
    }

    // 6. Resolver Use Case via DI
    const useCase = container.resolve<IGenerateSpedFiscal>(TOKENS.GenerateSpedFiscalUseCase);

    // 7. Executar geração
    console.log(`📄 Gerando SPED Fiscal ${competencia} (${finalidade}) para org ${ctx.organizationId}...`);

    const result = await useCase.execute(
      {
        competencia,
        finalidade: finalidade as 'ORIGINAL' | 'RETIFICADORA' | 'SUBSTITUTA',
        hashRetificado,
      },
      {
        organizationId: ctx.organizationId,
        branchId: ctx.defaultBranchId,
        userId: ctx.userId,
      }
    );

    // 8. Tratar resultado
    if (Result.isFail(result)) {
      console.error('❌ Erro ao gerar SPED Fiscal:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // 9. Retornar arquivo para download
    console.log(`✅ SPED Fiscal gerado: ${result.value.filename}`);

    return new NextResponse(result.value.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.value.filename}"`,
        'X-Sped-Hash': result.value.hash,
        'X-Sped-Total-Registros': String(result.value.totalRegistros),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro inesperado ao gerar SPED Fiscal:', error);
    return NextResponse.json(
      { error: `Erro interno: ${errorMessage}` },
      { status: 500 }
    );
  }
}































