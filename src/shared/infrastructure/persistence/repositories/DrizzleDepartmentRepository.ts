/**
 * Repository: DrizzleDepartmentRepository
 * Implementação Drizzle do repositório de departments
 *
 * @module shared/infrastructure/persistence/repositories
 */
import { eq, and, isNull } from 'drizzle-orm';
import type { IDepartmentRepository, DepartmentFilter } from '../../../domain/ports/output/IDepartmentRepository';
import { Department } from '../../../domain/entities/Department';
import { DepartmentMapper } from '../mappers/DepartmentMapper';
import { departmentTable } from '../schemas/department.schema';
import { db } from '@/lib/db';
import { Result } from '@/shared/domain';
import { injectable } from 'tsyringe';

const DEFAULT_DEPARTMENTS = [
  { code: 'FIN', name: 'Financeiro', description: 'Gestão financeira e contabilidade' },
  { code: 'OPS', name: 'Operações', description: 'Gestão de operações do dia a dia' },
  { code: 'RH', name: 'Recursos Humanos', description: 'Gestão de pessoas e recrutamento' },
  { code: 'TI', name: 'Tecnologia da Informação', description: 'Tecnologia e sistemas' },
  { code: 'MKT', name: 'Marketing', description: 'Marketing e comunicação' },
  { code: 'VENDAS', name: 'Vendas', description: 'Vendas e desenvolvimento de negócios' },
  { code: 'LOG', name: 'Logística', description: 'Supply chain e logística' },
  { code: 'JUR', name: 'Jurídico', description: 'Departamento jurídico' },
];

@injectable()
export class DrizzleDepartmentRepository implements IDepartmentRepository {
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Department | null> {
    const rows = await db
      .select()
      .from(departmentTable)
      .where(
        and(
          eq(departmentTable.id, id),
          eq(departmentTable.organizationId, organizationId),
          eq(departmentTable.branchId, branchId),
          isNull(departmentTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = DepartmentMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findByCode(
    code: string,
    organizationId: number,
    branchId: number
  ): Promise<Department | null> {
    const rows = await db
      .select()
      .from(departmentTable)
      .where(
        and(
          eq(departmentTable.code, code.toUpperCase()),
          eq(departmentTable.organizationId, organizationId),
          eq(departmentTable.branchId, branchId),
          isNull(departmentTable.deletedAt)
        )
      );

    if (rows.length === 0) return null;

    const result = DepartmentMapper.toDomain(rows[0]);
    return Result.isOk(result) ? result.value : null;
  }

  async findAll(filter: DepartmentFilter): Promise<Department[]> {
    const { organizationId, branchId, isActive, parentId } = filter;

    const conditions = [
      eq(departmentTable.organizationId, organizationId),
      eq(departmentTable.branchId, branchId),
      isNull(departmentTable.deletedAt),
    ];

    if (isActive !== undefined) {
      conditions.push(eq(departmentTable.isActive, isActive));
    }

    if (parentId === null) {
      conditions.push(isNull(departmentTable.parentId));
    } else if (parentId) {
      conditions.push(eq(departmentTable.parentId, parentId));
    }

    const rows = await db
      .select()
      .from(departmentTable)
      .where(and(...conditions))
      .orderBy(departmentTable.code);

    return rows
      .map((row) => DepartmentMapper.toDomain(row))
      .filter(Result.isOk)
      .map((r) => r.value);
  }

  async save(department: Department): Promise<Result<void, string>> {
    try {
      const persistence = DepartmentMapper.toPersistence(department);

      const existing = await this.exists(
        department.id,
        department.organizationId,
        department.branchId
      );

      if (existing) {
        await db
          .update(departmentTable)
          .set({
            name: persistence.name,
            description: persistence.description,
            parentId: persistence.parentId,
            managerUserId: persistence.managerUserId,
            isActive: persistence.isActive,
            updatedAt: new Date(),
            updatedBy: persistence.updatedBy,
          })
          .where(
            and(
              eq(departmentTable.id, persistence.id),
              eq(departmentTable.organizationId, persistence.organizationId),
              eq(departmentTable.branchId, persistence.branchId)
            )
          );
      } else {
        await db.insert(departmentTable).values(persistence);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error.message : 'Failed to save department'
      );
    }
  }

  async delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<void, string>> {
    try {
      await db
        .update(departmentTable)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(departmentTable.id, id),
            eq(departmentTable.organizationId, organizationId),
            eq(departmentTable.branchId, branchId)
          )
        );
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error.message : 'Failed to delete department'
      );
    }
  }

  async seedDefaults(
    organizationId: number,
    branchId: number,
    createdBy?: string
  ): Promise<Result<Department[], string>> {
    const created: Department[] = [];

    for (const def of DEFAULT_DEPARTMENTS) {
      // Check if already exists
      const existing = await this.findByCode(def.code, organizationId, branchId);
      if (existing) continue;

      const result = Department.create({
        organizationId,
        branchId,
        code: def.code,
        name: def.name,
        description: def.description,
        createdBy,
      });

      if (Result.isOk(result)) {
        const saveResult = await this.save(result.value);
        if (Result.isOk(saveResult)) {
          created.push(result.value);
        }
      }
    }

    return Result.ok(created);
  }

  private async exists(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<boolean> {
    const rows = await db
      .select({ id: departmentTable.id })
      .from(departmentTable)
      .where(
        and(
          eq(departmentTable.id, id),
          eq(departmentTable.organizationId, organizationId),
          eq(departmentTable.branchId, branchId),
          isNull(departmentTable.deletedAt)
        )
      );

    return rows.length > 0;
  }
}
