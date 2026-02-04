/**
 * 🧪 ENDPOINT TEMPORÁRIO DE TESTE - REMOVER APÓS VALIDAÇÃO
 * 
 * Testa cache Redis na rota de dashboard SEM autenticação
 * Apenas para diagnóstico em desenvolvimento
 */
import { NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IGetDashboardDataUseCase } from '@/modules/strategic/application/queries/GetDashboardDataQuery';
import { Result } from '@/shared/domain';

export const dynamic = 'force-dynamic';

export const GET = withDI(async () => {
  try {
    // ⚠️ BYPASS AUTH - apenas para teste de cache
    const mockContext = {
      userId: '95ca4fb9-49b6-44c2-814d-c4b72f9f7d8b',
      organizationId: 1,
      role: 'admin',
      branchId: 1,
      defaultBranchId: 1,
      allowedBranches: [1],
      isAdmin: true,
    };

    const getDashboardData = container.resolve<IGetDashboardDataUseCase>(
      STRATEGIC_TOKENS.GetDashboardDataUseCase
    );

    const startTime = Date.now();
    
    const result = await getDashboardData.execute(
      { includeInsight: true },
      mockContext
    );

    const executionTime = Date.now() - startTime;

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error, executionTime },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...result.value,
      _meta: {
        executionTime,
        timestamp: new Date().toISOString(),
        warning: '⚠️ ENDPOINT DE TESTE - REMOVER EM PRODUÇÃO',
      },
    });
  } catch (error) {
    console.error('Error in test-cache-dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
});
