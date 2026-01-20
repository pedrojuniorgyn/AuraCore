/**
 * API Route: Dashboard Layout
 * Persistência de preferências de layout do dashboard por usuário
 * 
 * @route GET/PUT /api/strategic/dashboard/layout
 * @since E10 Fase 1 - Conectar dados reais
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { container } from '@/shared/infrastructure/di/container';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IUserDashboardLayoutRepository } from '@/modules/strategic/domain/ports/output/IUserDashboardLayoutRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const organizationId = session.user.organizationId;
    const branchId = session.user.defaultBranchId || 1;

    // Resolver repositório via DI
    const repository = container.resolve<IUserDashboardLayoutRepository>(
      STRATEGIC_TOKENS.UserDashboardLayoutRepository
    );

    // Buscar layout do usuário
    const layout = await repository.findByUserId(userId, organizationId, branchId);

    return NextResponse.json({
      layout: layout || [],
    });
  } catch (error) {
    console.error('Error fetching dashboard layout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { layout } = await request.json();
    
    if (!Array.isArray(layout)) {
      return NextResponse.json({ error: 'Invalid layout format' }, { status: 400 });
    }

    const userId = session.user.id;
    const organizationId = session.user.organizationId;
    const branchId = session.user.defaultBranchId || 1;

    // Resolver repositório via DI
    const repository = container.resolve<IUserDashboardLayoutRepository>(
      STRATEGIC_TOKENS.UserDashboardLayoutRepository
    );

    // Salvar layout do usuário
    await repository.save(userId, organizationId, branchId, layout);

    console.log('Dashboard layout saved for user:', userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving dashboard layout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
