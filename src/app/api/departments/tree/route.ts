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
import { CacheService, CacheTTL } from '@/services/cache.service';

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
  level: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children: DepartmentTreeNode[];
}

/**
 * Item da lista flat (sem children, com level)
 */
interface DepartmentFlatItem {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  level: number;
  isActive: boolean;
}

/**
 * Metadata da árvore
 */
interface TreeMetadata {
  totalDepartments: number;
  maxDepth: number;
  rootDepartments: number;
}

/**
 * Response completa da API
 */
interface DepartmentsTreeResponse {
  success: boolean;
  tree: DepartmentTreeNode[];
  flat: DepartmentFlatItem[];
  metadata: TreeMetadata;
}

/**
 * GET /api/departments/tree
 * Retorna hierarquia completa de departments (árvore + flat + metadata)
 *
 * Query params:
 * - active: true|false (filtrar apenas ativos/inativos)
 * - includeInactive: true (alias para active=undefined, inclui todos)
 *
 * Response:
 * {
 *   success: true,
 *   tree: DepartmentTreeNode[] (roots com children recursivos),
 *   flat: DepartmentFlatItem[] (lista plana com níveis),
 *   metadata: { totalDepartments, maxDepth, rootDepartments }
 * }
 *
 * Cache:
 * - TTL: 30 minutos (CacheTTL.MEDIUM)
 * - Key: departments:tree:{orgId}:{branchId}:{activeFilter}
 * - Headers: X-Cache (HIT/MISS), X-Cache-Key, X-Cache-TTL
 */
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const isActiveParam = searchParams.get('active');
    const includeInactiveParam = searchParams.get('includeInactive');

    // Converter query param 'active' ou 'includeInactive' para boolean ou undefined
    // - 'active=true' → true (apenas ativos)
    // - 'active=false' → false (apenas inativos)
    // - 'includeInactive=true' → undefined (todos)
    // - null/undefined/outros → undefined (default: todos - comportamento original)
    let isActive: boolean | undefined;
    
    if (includeInactiveParam === 'true') {
      isActive = undefined; // Incluir todos
    } else if (isActiveParam === 'true') {
      isActive = true;
    } else if (isActiveParam === 'false') {
      isActive = false;
    } else {
      isActive = undefined; // Default: todos (manter comportamento original)
    }

    // Cache key (inclui activeFilter para cache diferenciado)
    const activeFilter = isActive === true ? 'active' : isActive === false ? 'inactive' : 'all';
    const cacheKey = `tree:${tenantContext.organizationId}:${tenantContext.branchId}:${activeFilter}`;

    // 1. Tentar buscar do cache
    const cached = await CacheService.get<DepartmentsTreeResponse>(cacheKey, 'departments:');
    
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'X-Cache-Key': `departments:${cacheKey}`,
          'X-Cache-TTL': String(CacheTTL.MEDIUM),
        },
      });
    }

    // 2. Cache MISS - buscar do banco

    const repository = container.resolve<IDepartmentRepository>(
      TOKENS.DepartmentRepository
    );

    // 1. Buscar TODOS os departments do tenant (sem filtro de status)
    // Isso garante que a hierarquia seja construída corretamente mesmo quando
    // filtrando por status (pais inativos de filhos ativos são necessários)
    const allDepartments = await repository.findAll({
      organizationId: tenantContext.organizationId,
      branchId: tenantContext.branchId,
      // NÃO aplicar isActive aqui - aplicar depois para preservar hierarquia
    });

    // 2. Construir árvore recursiva (com TODOS os departamentos)
    const { tree: fullTree, nodeMap } = buildTreeFromArray(allDepartments);

    // 3. Construir lista flat com níveis da árvore (single source of truth)
    // Isso garante consistência entre tree e flat
    const fullFlat = buildFlatListFromTree(allDepartments, nodeMap);

    // 4. Aplicar filtro de status se especificado
    // Filtrar a saída, não a entrada - preserva hierarquia correta
    let tree = fullTree;
    let flat = fullFlat;
    
    if (isActive !== undefined) {
      // Filtrar árvore recursivamente
      tree = filterTreeByStatus(fullTree, isActive);
      // Filtrar lista flat
      flat = fullFlat.filter(d => d.isActive === isActive);
    }

    // 5. Calcular metadata (baseado na saída filtrada)
    const metadata: TreeMetadata = {
      totalDepartments: flat.length,
      maxDepth: calculateMaxDepth(tree),
      rootDepartments: tree.length,
    };

    const response: DepartmentsTreeResponse = {
      success: true,
      tree,
      flat,
      metadata,
    };

    // 3. Salvar no cache
    await CacheService.set(cacheKey, response, CacheTTL.MEDIUM, 'departments:');

    return NextResponse.json(response, {
      headers: {
        'X-Cache': 'MISS',
        'X-Cache-Key': `departments:${cacheKey}`,
        'X-Cache-TTL': String(CacheTTL.MEDIUM),
      },
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
 * Resultado da construção da árvore
 */
interface BuildTreeResult {
  tree: DepartmentTreeNode[];
  nodeMap: Map<string, DepartmentTreeNode>;
}

/**
 * Constrói árvore hierárquica a partir de array de departments
 * Algoritmo O(n) usando Map para lookup eficiente
 * 
 * IMPORTANTE: Detecta e ignora referências circulares (A→B→A)
 * para evitar stack overflow em dados inconsistentes.
 *
 * @param departments - Array de Department entities
 * @returns Objeto com árvore e mapa de nodes (para reutilização de níveis)
 */
function buildTreeFromArray(departments: Department[]): BuildTreeResult {
  // Mapa para lookup rápido O(1): id -> department
  const deptMap = new Map<string, Department>();
  departments.forEach(dept => deptMap.set(dept.id, dept));

  // Mapa para lookup rápido: id -> node
  const nodeMap = new Map<string, DepartmentTreeNode>();

  // 1. Criar todos os nodes primeiro (level será definido depois)
  departments.forEach(dept => {
    nodeMap.set(dept.id, departmentToNode(dept, 0));
  });

  // 2. Montar hierarquia (com detecção de ciclos)
  // NÃO definimos levels aqui - serão calculados na etapa 3
  const roots: DepartmentTreeNode[] = [];

  departments.forEach(dept => {
    const node = nodeMap.get(dept.id);
    if (!node) return;

    if (dept.parentId === null) {
      // É root
      roots.push(node);
    } else {
      // Tem parent - verificar se não cria ciclo
      const parent = nodeMap.get(dept.parentId);
      if (parent) {
        // Detectar ciclo usando deptMap para lookup O(1)
        if (detectCycleOptimized(dept.id, dept.parentId, deptMap)) {
          console.warn(
            `⚠️ Ciclo detectado: department ${dept.id} → parent ${dept.parentId}. Tratando como root.`
          );
          roots.push(node);
        } else {
          // Adicionar como filho - level será calculado depois
          parent.children.push(node);
        }
      } else {
        // Parent não encontrado (possível inconsistência), tratar como root
        roots.push(node);
      }
    }
  });

  // 3. Calcular levels recursivamente a partir das roots
  // Isso garante que cada node tenha o level correto baseado em sua posição na árvore
  const visited = new Set<string>();
  updateLevelsRecursive(roots, 0, visited);

  // 4. Ordenar por código
  const sortVisited = new Set<string>();
  sortTreeByCode(roots, sortVisited);

  return { tree: roots, nodeMap };
}

/**
 * Detecta se adicionar parentId criaria um ciclo na hierarquia
 * Versão otimizada usando Map para lookup O(1)
 * 
 * IMPORTANTE: Esta função detecta APENAS se nodeId voltaria para si mesmo.
 * Loops infinitos pré-existentes nos dados (que não envolvem nodeId) não são
 * detectados aqui, pois são problemas separados que serão tratados por
 * updateLevelsRecursive com seu visited set.
 * 
 * @param nodeId - ID do node sendo processado
 * @param parentId - ID do parent proposto
 * @param deptMap - Map de id -> Department para lookup O(1)
 * @returns true se há ciclo envolvendo nodeId, false caso contrário
 */
function detectCycleOptimized(
  nodeId: string,
  parentId: string,
  deptMap: Map<string, Department>
): boolean {
  let currentId: string | null = parentId;
  // Limite de iterações para prevenir loops infinitos pré-existentes
  let iterations = 0;
  const maxIterations = 1000; // Limite razoável para hierarquias empresariais

  while (currentId !== null && iterations < maxIterations) {
    // Se chegarmos de volta ao nodeId, há ciclo direto
    if (currentId === nodeId) {
      return true;
    }

    iterations++;

    // Encontrar o parent do current usando Map O(1)
    const current = deptMap.get(currentId);
    currentId = current?.parentId ?? null;
  }

  // Se atingiu o limite, há loop infinito nos dados, mas não envolve nodeId
  // Não rejeitar, deixar updateLevelsRecursive lidar com isso
  if (iterations >= maxIterations) {
    console.warn(
      `⚠️ Loop infinito detectado na cadeia de ancestors (não envolve node ${nodeId})`
    );
  }

  return false;
}

/**
 * Atualiza levels recursivamente com proteção contra ciclos
 * 
 * @param nodes - Nodes a atualizar
 * @param level - Nível atual
 * @param visited - Set de IDs já visitados (proteção contra ciclos)
 */
function updateLevelsRecursive(
  nodes: DepartmentTreeNode[],
  level: number,
  visited: Set<string>
): void {
  nodes.forEach(node => {
    // Proteção contra ciclos: se já visitamos este node, pular
    if (visited.has(node.id)) {
      console.warn(`⚠️ updateLevelsRecursive: ciclo detectado em node ${node.id}, pulando.`);
      return;
    }
    
    visited.add(node.id);
    node.level = level;
    
    if (node.children.length > 0) {
      updateLevelsRecursive(node.children, level + 1, visited);
    }
  });
}

/**
 * Ordena árvore por código (recursivo) com proteção contra ciclos
 * 
 * @param nodes - Nodes a ordenar
 * @param visited - Set de IDs já visitados (proteção contra ciclos)
 */
function sortTreeByCode(nodes: DepartmentTreeNode[], visited: Set<string>): void {
  nodes.sort((a, b) => a.code.localeCompare(b.code));
  
  nodes.forEach(node => {
    // Proteção contra ciclos: se já visitamos este node, pular
    if (visited.has(node.id)) {
      console.warn(`⚠️ sortTreeByCode: ciclo detectado em node ${node.id}, pulando.`);
      return;
    }
    
    visited.add(node.id);
    
    if (node.children.length > 0) {
      sortTreeByCode(node.children, visited);
    }
  });
}

/**
 * Constrói lista flat usando níveis da árvore já construída
 * Isso garante consistência entre tree e flat (single source of truth para níveis)
 *
 * @param departments - Array de Department entities
 * @param nodeMap - Mapa de nodes da árvore (com níveis já calculados)
 * @returns Array de items flat com level consistente com a árvore
 */
function buildFlatListFromTree(
  departments: Department[],
  nodeMap: Map<string, DepartmentTreeNode>
): DepartmentFlatItem[] {
  // Construir lista flat usando níveis do nodeMap
  const flat: DepartmentFlatItem[] = departments.map(dept => {
    const node = nodeMap.get(dept.id);
    return {
      id: dept.id,
      code: dept.code,
      name: dept.name,
      parentId: dept.parentId,
      level: node?.level ?? 0, // Usar nível da árvore (single source of truth)
      isActive: dept.isActive,
    };
  });

  // Ordenar: primeiro por level, depois por código
  flat.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.code.localeCompare(b.code);
  });

  return flat;
}

/**
 * Filtra árvore recursivamente por status (ativo/inativo)
 * Preserva a estrutura hierárquica, removendo apenas nodes que não correspondem
 * 
 * @param tree - Árvore original
 * @param isActive - Status a filtrar (true = ativos, false = inativos)
 * @returns Árvore filtrada
 */
function filterTreeByStatus(
  tree: DepartmentTreeNode[],
  isActive: boolean
): DepartmentTreeNode[] {
  const filteredTree: DepartmentTreeNode[] = [];

  for (const node of tree) {
    // Filtrar children recursivamente primeiro
    const filteredChildren = filterTreeByStatus(node.children, isActive);

    // Incluir node se corresponde ao filtro OU se tem filhos que correspondem
    if (node.isActive === isActive) {
      // Node corresponde ao filtro - incluir com children filtrados
      filteredTree.push({
        ...node,
        children: filteredChildren,
      });
    } else if (filteredChildren.length > 0) {
      // Node não corresponde, mas tem filhos que correspondem
      // Incluir os filhos como roots neste nível
      filteredTree.push(...filteredChildren);
    }
    // Se node não corresponde e não tem filhos que correspondem, não incluir
  }

  return filteredTree;
}

/**
 * Calcula profundidade máxima da árvore
 *
 * @param tree - Array de nodes raiz
 * @returns Profundidade máxima (0 se vazio)
 */
function calculateMaxDepth(tree: DepartmentTreeNode[]): number {
  if (tree.length === 0) return 0;

  let maxDepth = 0;

  const traverse = (node: DepartmentTreeNode): void => {
    if (node.level > maxDepth) {
      maxDepth = node.level;
    }
    node.children.forEach(traverse);
  };

  tree.forEach(traverse);

  return maxDepth;
}

/**
 * Converte Department Entity em DepartmentTreeNode (DTO)
 *
 * @param department - Department Entity
 * @param level - Nível na hierarquia
 * @returns DepartmentTreeNode (DTO para API)
 */
function departmentToNode(department: Department, level: number): DepartmentTreeNode {
  return {
    id: department.id,
    code: department.code,
    name: department.name,
    description: department.description,
    parentId: department.parentId,
    managerUserId: department.managerUserId,
    level,
    isActive: department.isActive,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
    children: [],
  };
}
