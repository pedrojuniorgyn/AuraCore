/**
 * API Route: /api/departments/tree
 * GET - Retorna hierarquia completa de departments
 *
 * @module app/api/departments/tree
 * @see REPO-001 a REPO-012 (Repository Pattern)
 * @see REGRASMCP.MDC (Multi-tenancy obrigatório)
 */
import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { getTenantContext } from '@/lib/auth/context';
import type { IDepartmentRepository } from '@/shared/domain/ports/output/IDepartmentRepository';
import type { Department } from '@/shared/domain';

/**
 * Estrutura de Department Tree (recursiva)
 */
interface DepartmentTreeNode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  managerUserId: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children: DepartmentTreeNode[];
}

/**
 * GET /api/departments/tree
 * Retorna hierarquia completa de departments (árvore)
 *
 * Query params:
 * - active: true|false (filtrar apenas ativos/inativos)
 *
 * Response:
 * {
 *   success: true,
 *   data: DepartmentTreeNode[] (roots com children recursivos)
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const isActiveParam = searchParams.get('active');

    // Converter query param 'active' para boolean ou undefined
    // - 'true' → true (apenas ativos)
    // - 'false' → false (apenas inativos)
    // - null/undefined/outros → undefined (todos)
    const isActive = isActiveParam === 'true' 
      ? true 
      : isActiveParam === 'false' 
        ? false 
        : undefined;

    const repository = container.resolve<IDepartmentRepository>(
      TOKENS.DepartmentRepository
    );

    // 1. Buscar apenas roots (departments sem parent)
    const rootDepartments = await repository.findAll({
      organizationId: tenantContext.organizationId,
      branchId: tenantContext.branchId,
      parentId: null,
      isActive,
    });

    // 2. Construir árvore recursiva para cada root
    const tree: DepartmentTreeNode[] = await Promise.all(
      rootDepartments.map(async (root) => {
        const node = departmentToNode(root);
        node.children = await buildChildren(
          root.id,
          repository,
          tenantContext.organizationId,
          tenantContext.branchId,
          isActive
        );
        return node;
      })
    );

    return NextResponse.json({
      success: true,
      data: tree,
      count: tree.length,
    });
  } catch (error) {
    // API-ERR-001: getTenantContext() throws NextResponse on auth failure
    if (error instanceof NextResponse) {
      return error; // Return original 401/403 response
    }
    console.error('Error building department tree:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Função recursiva para construir children de um department
 *
 * @param parentId - ID do department pai
 * @param repository - Repository de departments
 * @param organizationId - Multi-tenancy
 * @param branchId - Multi-tenancy
 * @param isActive - Filtro de status
 * @returns Array de DepartmentTreeNode com children recursivos
 */
async function buildChildren(
  parentId: string,
  repository: IDepartmentRepository,
  organizationId: number,
  branchId: number,
  isActive: boolean | undefined
): Promise<DepartmentTreeNode[]> {
  // Buscar children diretos
  const children = await repository.findAll({
    organizationId,
    branchId,
    parentId,
    isActive,
  });

  // Recursão: construir children de cada child
  return Promise.all(
    children.map(async (child) => {
      const node = departmentToNode(child);
      node.children = await buildChildren(
        child.id,
        repository,
        organizationId,
        branchId,
        isActive
      );
      return node;
    })
  );
}

/**
 * Converte Department Entity em DepartmentTreeNode (DTO)
 *
 * @param department - Department Entity
 * @returns DepartmentTreeNode (DTO para API)
 */
function departmentToNode(department: Department): DepartmentTreeNode {
  return {
    id: department.id,
    code: department.code,
    name: department.name,
    description: department.description,
    parentId: department.parentId,
    managerUserId: department.managerUserId,
    isActive: department.isActive,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
    children: [], // Será populado recursivamente
  };
}
