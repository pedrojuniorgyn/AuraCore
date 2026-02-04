/**
 * Mock Store Centralizado para OKRs
 * 
 * ⚠️ TEMPORÁRIO: Este store em memória será substituído por implementação
 * DDD completa (Entity + Repository + Schema SQL) em próximo épico.
 * 
 * BUG-002: Centralizado para evitar fetch interno que causa erro 500
 * em produção devido a SSL.
 */

import type { OKR } from './okr-types';

// Store singleton
export const okrsStore = new Map<string, OKR>();

/**
 * Inicializa dados mock com UUIDs reais
 * IMPORTANTE: Usar UUIDs ao invés de strings descritivas para evitar
 * conflitos e permitir navegação correta nas páginas de detalhes.
 */
export function initializeMockOkrs(): void {
  if (okrsStore.size > 0) return;

  const now = new Date();
  const startQ1 = new Date('2026-01-01');
  const endQ1 = new Date('2026-03-31');

  // IDs fixos (UUIDs válidos) para permitir navegação consistente
  const corporateId = '550e8400-e29b-41d4-a716-446655440000';
  const logisticsId = '550e8400-e29b-41d4-a716-446655440001';
  const financeId = '550e8400-e29b-41d4-a716-446655440002';
  const commercialId = '550e8400-e29b-41d4-a716-446655440003';
  const teamNorthId = '550e8400-e29b-41d4-a716-446655440004';

  // Corporate OKR
  const corporateOKR: OKR = {
    id: corporateId,
    title: 'Aumentar eficiência operacional em 20%',
    description: 'Objetivo estratégico principal para Q1 2026',
    level: 'corporate',
    periodType: 'quarter',
    periodLabel: 'Q1 2026',
    startDate: startQ1,
    endDate: endQ1,
    ownerId: 'user-ceo',
    ownerName: 'CEO',
    ownerType: 'user',
    keyResults: [
      {
        id: 'kr-1',
        okrId: corporateId,
        title: 'Reduzir custo por entrega em 15%',
        metricType: 'currency',
        startValue: 8.5,
        targetValue: 7.23,
        currentValue: 7.65,
        progress: 70,
        status: 'on_track',
        weight: 40,
        valueHistory: [
          { value: 8.5, progress: 0, timestamp: startQ1, updatedBy: 'Sistema' },
          { value: 8.0, progress: 39, timestamp: new Date('2026-01-15'), updatedBy: 'João Silva' },
          { value: 7.65, progress: 70, timestamp: new Date('2026-01-20'), updatedBy: 'Maria Santos' },
        ],
        order: 1,
        createdAt: startQ1,
        updatedAt: now,
      },
      {
        id: 'kr-2',
        okrId: corporateId,
        title: 'Aumentar OTD para 95%',
        metricType: 'percentage',
        startValue: 88,
        targetValue: 95,
        currentValue: 92,
        progress: 55,
        status: 'at_risk',
        linkedKpiId: 'kpi-cli-001',
        linkedKpiName: 'Taxa de Entrega',
        weight: 35,
        valueHistory: [
          { value: 88, progress: 0, timestamp: startQ1, updatedBy: 'Sistema' },
          { value: 90, progress: 29, timestamp: new Date('2026-01-10'), updatedBy: 'Sistema' },
          { value: 92, progress: 55, timestamp: new Date('2026-01-18'), updatedBy: 'Sistema' },
        ],
        order: 2,
        createdAt: startQ1,
        updatedAt: now,
      },
      {
        id: 'kr-3',
        okrId: corporateId,
        title: 'Reduzir devoluções para < 2%',
        metricType: 'percentage',
        startValue: 5,
        targetValue: 2,
        currentValue: 2.5,
        progress: 80,
        status: 'on_track',
        weight: 25,
        valueHistory: [
          { value: 5, progress: 0, timestamp: startQ1, updatedBy: 'Sistema' },
          { value: 3.5, progress: 50, timestamp: new Date('2026-01-12'), updatedBy: 'Pedro Alves' },
          { value: 2.5, progress: 80, timestamp: new Date('2026-01-19'), updatedBy: 'Pedro Alves' },
        ],
        order: 3,
        createdAt: startQ1,
        updatedAt: now,
      },
    ],
    progress: 65,
    status: 'active',
    organizationId: 1,
    branchId: 1,
    createdAt: startQ1,
    updatedAt: now,
    createdBy: 'user-ceo',
  };

  // Department OKR - Logistics
  const logisticsOKR: OKR = {
    id: logisticsId,
    title: 'Otimizar rotas de entrega',
    description: 'Melhorar eficiência das rotas para reduzir custos e tempo',
    level: 'department',
    parentId: corporateId,
    periodType: 'quarter',
    periodLabel: 'Q1 2026',
    startDate: startQ1,
    endDate: endQ1,
    ownerId: 'dept-logistics',
    ownerName: 'Logística',
    ownerType: 'department',
    keyResults: [
      {
        id: 'kr-log-1',
        okrId: logisticsId,
        title: 'Implementar roteirização automática',
        metricType: 'percentage',
        startValue: 0,
        targetValue: 100,
        currentValue: 75,
        progress: 75,
        status: 'on_track',
        weight: 50,
        valueHistory: [],
        order: 1,
        createdAt: startQ1,
        updatedAt: now,
      },
      {
        id: 'kr-log-2',
        okrId: logisticsId,
        title: 'Reduzir km rodados em 10%',
        metricType: 'percentage',
        startValue: 0,
        targetValue: 10,
        currentValue: 7.5,
        progress: 75,
        status: 'on_track',
        weight: 50,
        valueHistory: [],
        order: 2,
        createdAt: startQ1,
        updatedAt: now,
      },
    ],
    progress: 75,
    status: 'active',
    organizationId: 1,
    branchId: 1,
    createdAt: startQ1,
    updatedAt: now,
    createdBy: 'user-logistics-mgr',
  };

  // Department OKR - Finance
  const financeOKR: OKR = {
    id: financeId,
    title: 'Reduzir custos operacionais',
    level: 'department',
    parentId: corporateId,
    periodType: 'quarter',
    periodLabel: 'Q1 2026',
    startDate: startQ1,
    endDate: endQ1,
    ownerId: 'dept-finance',
    ownerName: 'Financeiro',
    ownerType: 'department',
    keyResults: [
      {
        id: 'kr-fin-1',
        okrId: financeId,
        title: 'Renegociar contratos com fornecedores',
        metricType: 'percentage',
        startValue: 0,
        targetValue: 100,
        currentValue: 60,
        progress: 60,
        status: 'at_risk',
        weight: 100,
        valueHistory: [],
        order: 1,
        createdAt: startQ1,
        updatedAt: now,
      },
    ],
    progress: 60,
    status: 'active',
    organizationId: 1,
    branchId: 1,
    createdAt: startQ1,
    updatedAt: now,
    createdBy: 'user-finance-mgr',
  };

  // Department OKR - Commercial
  const commercialOKR: OKR = {
    id: commercialId,
    title: 'Aumentar vendas em 15%',
    level: 'department',
    parentId: corporateId,
    periodType: 'quarter',
    periodLabel: 'Q1 2026',
    startDate: startQ1,
    endDate: endQ1,
    ownerId: 'dept-commercial',
    ownerName: 'Comercial',
    ownerType: 'department',
    keyResults: [
      {
        id: 'kr-com-1',
        okrId: commercialId,
        title: 'Conquistar 50 novos clientes',
        metricType: 'number',
        startValue: 0,
        targetValue: 50,
        currentValue: 35,
        progress: 70,
        status: 'on_track',
        weight: 100,
        valueHistory: [],
        order: 1,
        createdAt: startQ1,
        updatedAt: now,
      },
    ],
    progress: 70,
    status: 'active',
    organizationId: 1,
    branchId: 1,
    createdAt: startQ1,
    updatedAt: now,
    createdBy: 'user-commercial-mgr',
  };

  // Team OKR
  const teamNorthOKR: OKR = {
    id: teamNorthId,
    title: 'Melhorar OTD Região Norte',
    level: 'team',
    parentId: logisticsId,
    periodType: 'quarter',
    periodLabel: 'Q1 2026',
    startDate: startQ1,
    endDate: endQ1,
    ownerId: 'team-north',
    ownerName: 'Equipe Norte',
    ownerType: 'team',
    keyResults: [
      {
        id: 'kr-north-1',
        okrId: teamNorthId,
        title: 'OTD Região Norte > 96%',
        metricType: 'percentage',
        startValue: 85,
        targetValue: 96,
        currentValue: 93,
        progress: 72,
        status: 'on_track',
        weight: 100,
        valueHistory: [],
        order: 1,
        createdAt: startQ1,
        updatedAt: now,
      },
    ],
    progress: 72,
    status: 'active',
    organizationId: 1,
    branchId: 1,
    createdAt: startQ1,
    updatedAt: now,
    createdBy: 'user-north-lead',
  };

  // Populate store
  okrsStore.set(corporateOKR.id, corporateOKR);
  okrsStore.set(logisticsOKR.id, logisticsOKR);
  okrsStore.set(financeOKR.id, financeOKR);
  okrsStore.set(commercialOKR.id, commercialOKR);
  okrsStore.set(teamNorthOKR.id, teamNorthOKR);
}

/**
 * Get all OKRs from store
 */
export function getAllOkrs(): OKR[] {
  initializeMockOkrs();
  return Array.from(okrsStore.values());
}

/**
 * Get OKR by ID
 */
export function getOkrById(id: string): OKR | undefined {
  initializeMockOkrs();
  return okrsStore.get(id);
}

/**
 * Create new OKR
 */
export function createOkr(okr: OKR): OKR {
  initializeMockOkrs();
  okrsStore.set(okr.id, okr);
  return okr;
}

/**
 * Update existing OKR
 */
export function updateOkr(id: string, updates: Partial<OKR>): OKR | undefined {
  initializeMockOkrs();
  const existing = okrsStore.get(id);
  if (!existing) return undefined;

  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  };

  okrsStore.set(id, updated);
  return updated;
}

/**
 * Delete OKR
 */
export function deleteOkr(id: string): boolean {
  initializeMockOkrs();
  return okrsStore.delete(id);
}
