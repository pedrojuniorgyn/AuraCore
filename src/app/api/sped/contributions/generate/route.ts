/**
 * 📄 SPED CONTRIBUTIONS GENERATION API ROUTE
 * 
 * POST /api/sped/contributions/generate
 * Gera arquivo SPED Contributions (EFD-Contribuições PIS/COFINS) usando arquitetura DDD/Hexagonal
 * 
 * @epic E7.18 - Migração SPED para Input Ports + Use Cases
 * @layer Presentation
 */

import { NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { auth } from '@/lib/auth';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IGenerateSpedContributions } from '@/modules/fiscal/domain/ports/input';

// Garantir que módulo está inicializado
import '@/modules/fiscal/infrastructure/bootstrap';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * POST /api/sped/contributions/generate
 * 
 * Body: {
 *   competencia: string;  // Formato MMAAAA (ex: 012026)
 *   finalidade?: "ORIGINAL" | "RETIFICADORA";
 *   hashRetificado?: string; // Obrigatório se finalidade != ORIGINAL
 * }
 * 
 * Response: Arquivo .txt com encoding ISO-8859-1
 */
export const POST = withDI(async (req: Request) => {
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
    const useCase = container.resolve<IGenerateSpedContributions>(TOKENS.GenerateSpedContributionsUseCase);

    // 7. Executar geração
    logger.info(`📄 Gerando SPED Contributions ${competencia} (${finalidade}) para org ${ctx.organizationId}...`);

    const result = await useCase.execute(
      {
        competencia,
        finalidade: finalidade as 'ORIGINAL' | 'RETIFICADORA',
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
      logger.error('❌ Erro ao gerar SPED Contributions:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // 9. Retornar arquivo
    logger.info(`✅ SPED Contributions gerado: ${result.value.filename}`);

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
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Erro inesperado ao gerar SPED Contributions:', error);
    return NextResponse.json(
      { error: `Erro interno: ${errorMessage}` },
      { status: 500 }
    );
  }
});

