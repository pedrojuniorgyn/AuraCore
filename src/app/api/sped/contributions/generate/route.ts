/**
 * 📄 SPED CONTRIBUTIONS GENERATION API ROUTE
 * 
 * POST /api/sped/contributions/generate
 * Gera arquivo SPED Contributions (EFD-Contribuições PIS/COFINS) usando arquitetura DDD
 * 
 * @epic E7.13 - Services → DDD/Hexagonal
 * @layer Presentation
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';
import { createGenerateSpedContributionsUseCase } from '@/modules/fiscal/infrastructure/di/FiscalModule';

/**
 * POST /api/sped/contributions/generate
 * 
 * Body: {
 *   month: number;                       // Ex: 12 (1-12)
 *   year: number;                        // Ex: 2024
 *   finality: "ORIGINAL" | "SUBSTITUTION"; // Opcional, default: ORIGINAL
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
    const { month, year, finality = 'ORIGINAL' } = body;

    // 4. Validações
    if (!month || !year) {
      return NextResponse.json(
        { error: 'month e year são obrigatórios' },
        { status: 400 }
      );
    }

    const referenceMonth = parseInt(month, 10);
    const referenceYear = parseInt(year, 10);

    if (isNaN(referenceMonth) || referenceMonth < 1 || referenceMonth > 12) {
      return NextResponse.json(
        { error: 'month inválido. Deve estar entre 1 e 12' },
        { status: 400 }
      );
    }

    if (isNaN(referenceYear) || referenceYear < 2000 || referenceYear > 2100) {
      return NextResponse.json(
        { error: 'year inválido. Deve estar entre 2000 e 2100' },
        { status: 400 }
      );
    }

    if (!['ORIGINAL', 'SUBSTITUTION'].includes(finality)) {
      return NextResponse.json(
        { error: 'finality inválido. Use "ORIGINAL" ou "SUBSTITUTION"' },
        { status: 400 }
      );
    }

    // 5. Criar Use Case
    const useCase = createGenerateSpedContributionsUseCase();

    // 6. Executar geração
    console.log(`📄 Gerando SPED Contributions ${referenceMonth}/${referenceYear} (${finality}) para org ${ctx.organizationId}...`);

    const result = await useCase.execute({
      organizationId: ctx.organizationId,
      branchId: ctx.defaultBranchId,
      referenceMonth,
      referenceYear,
      finality: finality as 'ORIGINAL' | 'SUBSTITUTION',
    });

    // 7. Tratar resultado
    if (Result.isFail(result)) {
      console.error('❌ Erro ao gerar SPED Contributions:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    // 8. Gerar buffer com encoding ISO-8859-1 (método já faz isso corretamente)
    const buffer = result.value.toBuffer();

    const fileName = `SPED_CONTRIBUICOES_${String(referenceMonth).padStart(2, '0')}_${referenceYear}.txt`;

    console.log(`✅ SPED Contributions gerado com sucesso: ${fileName}`);

    // 9. Retornar arquivo
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=ISO-8859-1',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro inesperado ao gerar SPED Contributions:', error);
    return NextResponse.json(
      { error: `Erro interno: ${errorMessage}` },
      { status: 500 }
    );
  }
}

