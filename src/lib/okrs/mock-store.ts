/**
 * Mock Store Centralizado para OKRs
 * 
 * ⚠️ TEMPORÁRIO: Este store em memória será substituído por implementação
 * DDD completa (Entity + Repository + Schema SQL) em próximo épico.
 * 
 * BUG-002: Centralizado para evitar fetch interno que causa erro 500
 * em produção devido a SSL.
 * 
 * ✅ FIX BUG-002: Persistência em arquivo JSON para evitar perda de dados
 * ao reiniciar servidor. Dados salvos em data/okrs.json (gitignored).
 */

import type { OKR } from './okr-types';
import fs from 'fs';
import path from 'path';

// Configuração de persistência
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'okrs.json');

/**
 * Carregar OKRs do arquivo JSON
 * Se arquivo não existe ou está corrompido, retorna Map vazio
 */
function loadFromFile(): Map<string, OKR> {
  try {
    // Garantir que diretório existe
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Carregar arquivo se existe
    if (fs.existsSync(DATA_FILE)) {
      const json = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(json);
      
      // Converter objeto para Map
      const store = new Map<string, OKR>();
      Object.entries(data).forEach(([id, okr]) => {
        store.set(id, okr as OKR);
      });
      
      console.log(`[OKR Store] Loaded ${store.size} OKRs from file`);
      return store;
    }
  } catch (error) {
    console.error('[OKR Store] Failed to load from file:', error);
  }
  
  return new Map();
}

/**
 * Salvar OKRs no arquivo JSON
 * Converte Map para objeto antes de serializar
 */
function saveToFile(store: Map<string, OKR>): void {
  try {
    // Converter Map para objeto
    const data: Record<string, OKR> = {};
    store.forEach((okr, id) => {
      data[id] = okr;
    });
    
    // Salvar com formatação para facilitar debug
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[OKR Store] Saved ${store.size} OKRs to file`);
  } catch (error) {
    console.error('[OKR Store] Failed to save to file:', error);
  }
}

// ✅ BUG-FIX: Lazy initialization para evitar falhas em serverless/containers
// Store singleton (inicializado sob demanda ao invés de module load time)
let okrsStore: Map<string, OKR> | null = null;

/**
 * Obter store singleton com lazy initialization
 * Garante que file system está pronto antes de carregar
 */
function getStore(): Map<string, OKR> {
  if (okrsStore === null) {
    okrsStore = loadFromFile();
    
    // Se store vazio após carregar, inicializar com dados mock
    if (okrsStore.size === 0) {
      initializeMockOkrs();
    }
  }
  return okrsStore;
}

/**
 * Inicializa dados mock com UUIDs reais
 * IMPORTANTE: Usar UUIDs ao invés de strings descritivas para evitar
 * conflitos e permitir navegação correta nas páginas de detalhes.
 * 
 * ✅ FIX BUG-002: Salva dados no arquivo após inicialização
 */
function initializeMockOkrs(): void {
  const store = getStore();
  if (store.size > 0) return;

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
  store.set(corporateOKR.id, corporateOKR);
  store.set(logisticsOKR.id, logisticsOKR);
  store.set(financeOKR.id, financeOKR);
  store.set(commercialOKR.id, commercialOKR);
  store.set(teamNorthOKR.id, teamNorthOKR);
  
  // ✅ FIX BUG-002: Persistir dados iniciais no arquivo
  saveToFile(store);
}

/**
 * Get all OKRs from store
 * ✅ FIX BUG-002: Lazy initialization garantida
 */
export function getAllOkrs(): OKR[] {
  const store = getStore();
  return Array.from(store.values());
}

/**
 * Get OKR by ID
 * ✅ FIX BUG-002: Lazy initialization garantida
 */
export function getOkrById(id: string): OKR | undefined {
  const store = getStore();
  return store.get(id);
}

/**
 * Create new OKR
 * ✅ FIX BUG-002: Persiste no arquivo após criar
 */
export function createOkr(okr: OKR): OKR {
  const store = getStore();
  store.set(okr.id, okr);
  
  // ✅ FIX BUG-002: Salvar no arquivo
  saveToFile(store);
  
  return okr;
}

/**
 * Update existing OKR
 * ✅ FIX BUG-002: Persiste no arquivo após atualizar
 */
export function updateOkr(id: string, updates: Partial<OKR>): OKR | undefined {
  const store = getStore();
  const existing = store.get(id);
  if (!existing) return undefined;

  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  };

  store.set(id, updated);
  
  // ✅ FIX BUG-002: Salvar no arquivo
  saveToFile(store);
  
  return updated;
}

/**
 * Delete OKR
 * ✅ FIX BUG-002: Persiste no arquivo após deletar
 */
export function deleteOkr(id: string): boolean {
  const store = getStore();
  const result = store.delete(id);
  
  // ✅ FIX BUG-002: Salvar no arquivo se deletou com sucesso
  if (result) {
    saveToFile(store);
  }
  
  return result;
}
