/**
 * Repository: DrizzleUserDashboardLayoutRepository
 * Implementação Drizzle do repositório de layouts de dashboard
 * 
 * @module strategic/infrastructure/persistence/repositories
 */
import { injectable } from 'tsyringe';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userDashboardLayoutTable } from '../schemas/user-dashboard-layout.schema';
import { logger } from '@/shared/infrastructure/logging';
import type { 
  IUserDashboardLayoutRepository,
  DashboardLayoutItem 
} from '../../../domain/ports/output/IUserDashboardLayoutRepository';

@injectable()
export class DrizzleUserDashboardLayoutRepository implements IUserDashboardLayoutRepository {
  async findByUserId(
    userId: string,
    organizationId: number,
    branchId: number
  ): Promise<DashboardLayoutItem[] | null> {
    const rows = await db
      .select()
      .from(userDashboardLayoutTable)
      .where(
        and(
          eq(userDashboardLayoutTable.userId, userId),
          eq(userDashboardLayoutTable.organizationId, organizationId),
          eq(userDashboardLayoutTable.branchId, branchId)
        )
      );

    if (rows.length === 0) return null;
    
    const row = rows[0];

    try {
      const layout = JSON.parse(row.layoutJson) as DashboardLayoutItem[];
      return layout;
    } catch {
      logger.error('Failed to parse dashboard layout JSON');
      return null;
    }
  }

  async save(
    userId: string,
    organizationId: number,
    branchId: number,
    layout: DashboardLayoutItem[]
  ): Promise<void> {
    const layoutJson = JSON.stringify(layout);
    const now = new Date();

    // Verificar se já existe
    const existing = await this.findByUserId(userId, organizationId, branchId);

    if (existing !== null) {
      // Update
      await db
        .update(userDashboardLayoutTable)
        .set({
          layoutJson,
          updatedAt: now,
        })
        .where(
          and(
            eq(userDashboardLayoutTable.userId, userId),
            eq(userDashboardLayoutTable.organizationId, organizationId),
            eq(userDashboardLayoutTable.branchId, branchId)
          )
        );
    } else {
      // Insert
      const id = globalThis.crypto.randomUUID();
      await db
        .insert(userDashboardLayoutTable)
        .values({
          id,
          organizationId,
          branchId,
          userId,
          layoutJson,
          createdAt: now,
          updatedAt: now,
        });
    }
  }

  async delete(
    userId: string,
    organizationId: number,
    branchId: number
  ): Promise<void> {
    await db
      .delete(userDashboardLayoutTable)
      .where(
        and(
          eq(userDashboardLayoutTable.userId, userId),
          eq(userDashboardLayoutTable.organizationId, organizationId),
          eq(userDashboardLayoutTable.branchId, branchId)
        )
      );
  }
}
