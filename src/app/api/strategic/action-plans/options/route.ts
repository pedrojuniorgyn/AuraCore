/**
 * API: GET /api/strategic/action-plans/options
 * Retorna opções para o formulário de criação de planos de ação
 *
 * @module app/api/strategic/action-plans/options
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
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

    // ========================================
    // 1. BUSCAR OBJETIVOS ESTRATÉGICOS
    // ========================================
    let objectives: Array<{ id: string; description: string }> = [];
    try {
      const goalRepo = container.resolve<IStrategicGoalRepository>(
        STRATEGIC_TOKENS.StrategicGoalRepository
      );
      const goalsResult = await goalRepo.findMany({
        organizationId,
        branchId,
        page: 1,
        pageSize: 100,
      });

      if (goalsResult.items) {
        objectives = goalsResult.items.map(goal => ({
          id: goal.id,
          description: goal.description,
        }));
      }
    } catch (error) {
      console.warn('[action-plans/options] Error fetching goals:', error);
    }

    // ========================================
    // 2. BUSCAR USUÁRIOS REAIS DO TENANT
    // ========================================
    // TODO: Refatorar para usar IUserRepository quando disponível
    let users: Array<{ id: string; name: string; email: string }> = [];
    try {
      // Query direta na tabela de usuários
      const usersResult = await db.execute<{
        id: string;
        name: string;
        email: string;
      }>(sql`
        SELECT
          u.id,
          COALESCE(u.name, u.email) as name,
          u.email
        FROM users u
        WHERE u.organization_id = ${organizationId}
          AND u.branch_id = ${branchId}
          AND u.deleted_at IS NULL
        ORDER BY u.name
      `);

      // Normalizar resultado (Drizzle pode retornar em diferentes formatos)
      const rows = Array.isArray(usersResult)
        ? usersResult
        : (usersResult as { recordset?: unknown[] }).recordset || [];

      users = (rows as Array<{ id: string; name: string; email: string }>).map(row => ({
        id: String(row.id),
        name: row.name || row.email,
        email: row.email,
      }));
    } catch (error) {
      console.warn('[action-plans/options] Error fetching users:', error);
      // Fallback: tentar buscar do contexto da sessão pelo menos
      if (session.user) {
        users = [{
          id: session.user.id || 'current',
          name: session.user.name || session.user.email || 'Usuário Atual',
          email: session.user.email || '',
        }];
      }
    }

    // ========================================
    // 3. BUSCAR DEPARTAMENTOS DO TENANT
    // ========================================
    // TODO: Refatorar para usar IDepartmentRepository quando disponível
    // Tabela departments não existe ainda - usar fallback
    const departments: Array<{ id: string; name: string }> = [
      { id: 'operations', name: 'Operações' },
      { id: 'commercial', name: 'Comercial' },
      { id: 'financial', name: 'Financeiro' },
      { id: 'it', name: 'TI' },
      { id: 'hr', name: 'RH' },
      { id: 'logistics', name: 'Logística' },
    ];

    // ========================================
    // 4. BUSCAR FILIAIS DO TENANT
    // ========================================
    let branches: Array<{ id: string; name: string }> = [];
    try {
      const branchResult = await db.execute<{ id: number; name: string }>(sql`
        SELECT id, name
        FROM branches
        WHERE organization_id = ${organizationId}
          AND deleted_at IS NULL
          AND status = 'ACTIVE'
        ORDER BY name
      `);

      const branchRows = Array.isArray(branchResult)
        ? branchResult
        : (branchResult as { recordset?: unknown[] }).recordset || [];

      branches = (branchRows as Array<{ id: number; name: string }>).map(row => ({
        id: String(row.id),
        name: row.name,
      }));
    } catch (error) {
      console.warn('[action-plans/options] Error fetching branches:', error);
      // Fallback com filial atual
      branches = [{ id: String(branchId), name: 'Filial Atual' }];
    }

    // ========================================
    // 5. RETORNAR TODAS AS OPÇÕES
    // ========================================
    return NextResponse.json({
      objectives,
      users,
      departments,
      branches,
      // Flag para UI saber se dados são reais ou fallback
      _meta: {
        usersSource: users.length > 1 ? 'database' : 'fallback',
        departmentsSource: 'fallback', // Sempre fallback até criar tabela
        branchesSource: branches.length > 1 || branches[0]?.id !== String(branchId) ? 'database' : 'fallback',
      },
    });
  } catch (error) {
    // Propagar erros de auth
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
