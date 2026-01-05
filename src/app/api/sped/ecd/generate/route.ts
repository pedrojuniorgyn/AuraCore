/**
 * 📄 SPED ECD GENERATION API ROUTE
 * 
 * POST /api/sped/ecd/generate
 * Gera arquivo ECD (Escrituração Contábil Digital) usando arquitetura DDD
 * 
 * @epic E7.13 - Services → DDD/Hexagonal
 * @layer Presentation
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';
import { createGenerateSpedEcdUseCase } from '@/modules/fiscal/infrastructure/di/FiscalModule';

/**
 * POST /api/sped/ecd/generate
 * 
 * Body: {
 *   year: number;        // Ex: 2024
 *   bookType: "G" | "R"; // G = Livro Geral, R = Razão Auxiliar
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
    const { year, bookType = 'G' } = body;

    // 4. Validações
    if (!year) {
      return NextResponse.json(
        { error: 'year é obrigatório' },
        { status: 400 }
      );
    }

    const referenceYear = parseInt(year, 10);
    if (isNaN(referenceYear) || referenceYear < 2000 || referenceYear > 2100) {
      return NextResponse.json(
        { error: 'year inválido. Deve estar entre 2000 e 2100' },
        { status: 400 }
      );
    }

    if (!['G', 'R'].includes(bookType)) {
      return NextResponse.json(
        { error: 'bookType inválido. Use "G" (Geral) ou "R" (Razão Auxiliar)' },
        { status: 400 }
      );
    }

    // 5. Validar que defaultBranchId não é null (ENFORCE-033)
    if (ctx.defaultBranchId === null || ctx.defaultBranchId === undefined) {
      return NextResponse.json(
        { success: false, error: 'Branch não configurado para este usuário' },
        { status: 400 }
      );
    }

    // 6. Criar Use Case
    const useCase = createGenerateSpedEcdUseCase();

    // 7. Executar geração
    console.log(`📄 Gerando SPED ECD ${referenceYear} (${bookType}) para org ${ctx.organizationId}...`);

    const result = await useCase.execute({
      organizationId: ctx.organizationId,
      branchId: ctx.defaultBranchId,  // Agora garantido não-null
      referenceYear,
      bookType,
    });

    // 8. Tratar resultado
    if (Result.isFail(result)) {
      console.error('❌ Erro ao gerar SPED ECD:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    // 9. Gerar buffer com encoding ISO-8859-1 (método já faz isso corretamente)
    const buffer = result.value.toBuffer();

    const fileName = `ECD_${referenceYear}_${bookType}.txt`;

    console.log(`✅ SPED ECD gerado com sucesso: ${fileName}`);

    // 10. Retornar arquivo
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=ISO-8859-1',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro inesperado ao gerar SPED ECD:', error);
    return NextResponse.json(
      { error: `Erro interno: ${errorMessage}` },
      { status: 500 }
    );
  }
}

