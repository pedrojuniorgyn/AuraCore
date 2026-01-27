/**
 * API: GET /api/strategic/action-plans/options
 * Retorna opções para o formulário de criação de planos de ação
 * 
 * @module app/api/strategic/action-plans/options
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTenantContext } from '@/lib/auth/context';
import { container } from '@/shared/infrastructure/di/container';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IStrategicGoalRepository } from '@/modules/strategic/domain/ports/output/IStrategicGoalRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 401 });
    }

    const { organizationId, branchId } = tenantContext;

    // Buscar objetivos estratégicos
    let objectives: Array<{ id: string; description: string }> = [];
    try {
      const goalRepo = container.resolve<IStrategicGoalRepository>(
        STRATEGIC_TOKENS.StrategicGoalRepository
      );
      const goalsResult = await goalRepo.findMany({
        organizationId,
        branchId,
        page: 1,
        pageSize: 50,
      });
      
      if (goalsResult.items) {
        objectives = goalsResult.items.map(goal => ({
          id: goal.id,
          description: goal.description,
        }));
      }
    } catch (error) {
      console.warn('[action-plans/options] Error fetching goals:', error);
      // Continua com lista vazia
    }

    // TODO: Buscar usuários reais via IUserRepository
    // Por enquanto, mock para desenvolvimento
    const users = [
      { id: '1', name: 'João Silva' },
      { id: '2', name: 'Maria Santos' },
      { id: '3', name: 'Pedro Lima' },
      { id: '4', name: 'Ana Costa' },
      { id: '5', name: 'Carlos Souza' },
      { id: '6', name: 'Lucas Ferreira' },
    ];

    // TODO: Buscar departamentos reais
    const departments = [
      { id: '1', name: 'Operações' },
      { id: '2', name: 'Comercial' },
      { id: '3', name: 'Financeiro' },
      { id: '4', name: 'TI' },
      { id: '5', name: 'RH' },
      { id: '6', name: 'Logística' },
    ];

    // TODO: Buscar filiais reais via tenant
    const branches = [
      { id: String(branchId), name: 'Filial Atual' },
    ];

    return NextResponse.json({
      objectives,
      users,
      departments,
      branches,
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/strategic/action-plans/options error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
