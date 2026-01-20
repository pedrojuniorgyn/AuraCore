/**
 * API Route: Dashboard Data
 * Retorna dados consolidados do dashboard estratégico
 * 
 * @route GET /api/strategic/dashboard/data
 * @since E10 Fase 1 - Conectar dados reais
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { container } from '@/shared/infrastructure/di/container';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IGetDashboardDataUseCase } from '@/modules/strategic/application/queries/GetDashboardDataQuery';
import { Result } from '@/shared/domain';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolver Use Case via DI
    const getDashboardData = container.resolve<IGetDashboardDataUseCase>(
      STRATEGIC_TOKENS.GetDashboardDataUseCase
    );

    // Executar Query
    const result = await getDashboardData.execute(
      { includeInsight: true },
      {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        role: session.user.role || 'user',
        branchId: session.user.defaultBranchId || 1,
        defaultBranchId: session.user.defaultBranchId,
        allowedBranches: session.user.allowedBranches || [],
        isAdmin: session.user.role === 'admin',
      }
    );

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.value);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
