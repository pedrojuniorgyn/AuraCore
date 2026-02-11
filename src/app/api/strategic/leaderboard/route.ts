/**
 * API: GET /api/strategic/leaderboard
 * Retorna ranking de usuários baseado em atividades
 * 
 * @module app/api/strategic/leaderboard
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import type { LeaderboardEntry } from '@/lib/gamification/gamification-types';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

// Tipo para resultado do banco
interface UserActivityRow {
  id: string;
  name: string | null;
  activityCount: number;
}

export const GET = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const department = searchParams.get('department');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // Suprimir warning
    void department;

    // Calcular data de início baseado no período
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterMonth, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Query usando SQL raw para compatibilidade MSSQL
    const result = await db.execute(sql`
      SELECT TOP ${limit}
        u.id,
        u.name,
        (
          SELECT COUNT(*) 
          FROM audit_logs al 
          WHERE al.user_id = u.id 
            AND al.organization_id = ${ctx.organizationId}
            AND al.created_at >= ${startDate}
        ) as activityCount
      FROM users u
      WHERE u.organization_id = ${ctx.organizationId}
      ORDER BY activityCount DESC
    `);

    const usersWithActivity = ((result as { recordset?: unknown[] }).recordset || result) as UserActivityRow[];

    // Converter para formato LeaderboardEntry
    const entries: LeaderboardEntry[] = usersWithActivity.map((user: UserActivityRow, index: number) => {
      // Calcular XP baseado em atividades (10 XP por atividade)
      const xp = (user.activityCount || 0) * 10;
      // Calcular nível (cada 100 XP = 1 nível)
      const level = Math.floor(xp / 100) + 1;

      return {
        rank: index + 1,
        previousRank: index + 1, // Sem histórico, igual ao atual
        userId: user.id,
        userName: user.name || 'Sem nome',
        level,
        totalXp: xp,
        achievementCount: Math.min(Math.floor(xp / 50), 30), // Aproximação
        isCurrentUser: user.id === ctx.userId,
      };
    });

    // Se lista vazia, retornar empty array
    return NextResponse.json({ 
      entries,
      period, 
      department: null,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
