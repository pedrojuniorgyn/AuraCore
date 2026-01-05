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

    // 5. Criar Use Case
    const useCase = createGenerateSpedEcdUseCase();

    // 6. Executar geração
    console.log(`📄 Gerando SPED ECD ${referenceYear} (${bookType}) para org ${ctx.organizationId}...`);

    const result = await useCase.execute({
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      referenceYear,
      bookType,
    });

    // 7. Tratar resultado
    if (Result.isFail(result)) {
      console.error('❌ Erro ao gerar SPED ECD:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    // 8. Converter para texto com encoding ISO-8859-1
    const textContent = result.value.toText();
    
    // SPED requer encoding ISO-8859-1 (latin1), não UTF-8
    const encoder = new TextEncoder();
    const utf8Bytes = encoder.encode(textContent);
    
    // Converter UTF-8 para ISO-8859-1
    // Para caracteres ASCII (0-127), UTF-8 = ISO-8859-1
    // Para caracteres especiais, manter mapeamento 1:1
    const latin1Bytes = new Uint8Array(utf8Bytes.length);
    for (let i = 0; i < utf8Bytes.length; i++) {
      latin1Bytes[i] = utf8Bytes[i] & 0xFF;
    }

    const fileName = `ECD_${referenceYear}_${bookType}.txt`;

    console.log(`✅ SPED ECD gerado com sucesso: ${fileName}`);

    // 9. Retornar arquivo
    return new NextResponse(latin1Bytes, {
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

