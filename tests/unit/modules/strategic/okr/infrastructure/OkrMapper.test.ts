/**
 * Unit Tests: OkrMapper
 * 
 * Tests for Domain <-> Persistence conversion.
 * Ensures MAPPER-004 compliance: toDomain uses reconstitute, not create.
 * 
 * @module tests/unit/modules/strategic/okr/infrastructure
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OkrMapper } from '@/modules/strategic/okr/infrastructure/persistence/mappers/OkrMapper';
import { OKR } from '@/modules/strategic/okr/domain/entities/OKR';
import { KeyResult } from '@/modules/strategic/okr/domain/entities/KeyResult';
import { Result } from '@/shared/domain';
import type { OkrRow, KeyResultRow } from '@/modules/strategic/okr/infrastructure/persistence/schemas/okr.schema';

describe('OkrMapper', () => {
  // ============================================================================
  // FIXTURES
  // ============================================================================
  
  const mockUUID = 'test-uuid-1234';
  
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue(mockUUID),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const createMockOkrRow = (overrides: Partial<OkrRow> = {}): OkrRow => ({
    id: 'okr-123',
    title: 'Aumentar receita',
    description: 'Objetivo Q1',
    level: 'corporate',
    parentId: null,
    periodType: 'quarter',
    periodLabel: 'Q1 2026',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-03-31'),
    ownerId: 'user-123',
    ownerName: 'João Silva',
    ownerType: 'user',
    progress: 50,
    status: 'active',
    organizationId: 1,
    branchId: 3,
    createdBy: 'admin-001',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-02-01'),
    deletedAt: null,
    ...overrides,
  });

  const createMockKeyResultRow = (okrId: string, overrides: Partial<KeyResultRow> = {}): KeyResultRow => ({
    id: 'kr-123',
    okrId,
    title: 'Aumentar vendas',
    description: null,
    metricType: 'percentage',
    startValue: 0,
    targetValue: 100,
    currentValue: 50,
    unit: '%',
    status: 'at_risk',
    weight: 100,
    orderIndex: 0,
    linkedKpiId: null,
    linkedActionPlanId: null,
    createdBy: 'admin-001',
    updatedBy: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-02-01'),
    ...overrides,
  });

  const createMockOKR = () => {
    const result = OKR.create({
      title: 'Objetivo para teste',
      description: 'Descrição do objetivo',
      level: 'corporate',
      periodType: 'quarter',
      periodLabel: 'Q1 2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-31'),
      ownerId: 'user-123',
      ownerName: 'João',
      ownerType: 'user',
      organizationId: 1,
      branchId: 3,
      createdBy: 'admin',
    });

    if (Result.isFail(result)) {
      throw new Error(`Failed to create OKR: ${result.error}`);
    }
    return result.value;
  };

  const createMockKeyResult = (title: string = 'KR1', id?: string) => {
    const result = KeyResult.create({
      id,
      title,
      metricType: 'percentage',
      startValue: 0,
      targetValue: 100,
      currentValue: 50,
      unit: '%',
      weight: 100,
      order: 0,
    });

    if (Result.isFail(result)) {
      throw new Error(`Failed to create KeyResult: ${result.error}`);
    }
    return result.value;
  };

  // ============================================================================
  // toDomain() Tests
  // ============================================================================

  describe('toDomain()', () => {
    it('deve converter OkrRow para OKR Domain Entity', () => {
      const okrRow = createMockOkrRow();
      const keyResultRows: KeyResultRow[] = [];

      const result = OkrMapper.toDomain(okrRow, keyResultRows);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const okr = result.value;
        expect(okr.id).toBe('okr-123');
        expect(okr.title).toBe('Aumentar receita');
        expect(okr.description).toBe('Objetivo Q1');
        expect(okr.level).toBe('corporate');
        expect(okr.periodType).toBe('quarter');
        expect(okr.status).toBe('active');
        expect(okr.progress).toBe(50);
        expect(okr.organizationId).toBe(1);
        expect(okr.branchId).toBe(3);
      }
    });

    it('deve converter OkrRow com KeyResults', () => {
      const okrRow = createMockOkrRow();
      const keyResultRows: KeyResultRow[] = [
        createMockKeyResultRow('okr-123', { id: 'kr-1', title: 'KR1' }),
        createMockKeyResultRow('okr-123', { id: 'kr-2', title: 'KR2', orderIndex: 1 }),
      ];

      const result = OkrMapper.toDomain(okrRow, keyResultRows);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const okr = result.value;
        expect(okr.keyResults).toHaveLength(2);
        expect(okr.keyResults[0].title).toBe('KR1');
        expect(okr.keyResults[1].title).toBe('KR2');
      }
    });

    it('deve preservar ID do KeyResult', () => {
      const okrRow = createMockOkrRow();
      const keyResultRows: KeyResultRow[] = [
        createMockKeyResultRow('okr-123', { id: 'kr-preserved-id' }),
      ];

      const result = OkrMapper.toDomain(okrRow, keyResultRows);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.keyResults[0].id).toBe('kr-preserved-id');
      }
    });

    it('deve converter description null para undefined', () => {
      const okrRow = createMockOkrRow({ description: null });
      const keyResultRows: KeyResultRow[] = [];

      const result = OkrMapper.toDomain(okrRow, keyResultRows);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.description).toBeUndefined();
      }
    });

    it('deve converter parentId null para undefined', () => {
      const okrRow = createMockOkrRow({ parentId: null });
      const keyResultRows: KeyResultRow[] = [];

      const result = OkrMapper.toDomain(okrRow, keyResultRows);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.parentId).toBeUndefined();
      }
    });

    it('deve converter strings de data para Date objects', () => {
      const okrRow = createMockOkrRow({
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-04-15'),
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-02-01'),
      });
      const keyResultRows: KeyResultRow[] = [];

      const result = OkrMapper.toDomain(okrRow, keyResultRows);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.startDate).toBeInstanceOf(Date);
        expect(result.value.endDate).toBeInstanceOf(Date);
      }
    });

    it('deve falhar se KeyResult for inválido', () => {
      const okrRow = createMockOkrRow();
      const keyResultRows: KeyResultRow[] = [
        createMockKeyResultRow('okr-123', { 
          title: '', // Título vazio = inválido
        }),
      ];

      const result = OkrMapper.toDomain(okrRow, keyResultRows);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('KeyResult');
      }
    });

    it('deve mapear todos os campos do KeyResult', () => {
      const okrRow = createMockOkrRow();
      const keyResultRows: KeyResultRow[] = [
        createMockKeyResultRow('okr-123', {
          id: 'kr-full',
          title: 'KR Completo',
          description: 'Descrição do KR',
          metricType: 'currency',
          startValue: 1000,
          targetValue: 5000,
          currentValue: 3000,
          unit: 'BRL',
          status: 'on_track',
          weight: 50,
          orderIndex: 3,
          linkedKpiId: 'kpi-123',
          linkedActionPlanId: 'ap-456',
        }),
      ];

      const result = OkrMapper.toDomain(okrRow, keyResultRows);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const kr = result.value.keyResults[0];
        expect(kr.id).toBe('kr-full');
        expect(kr.title).toBe('KR Completo');
        expect(kr.description).toBe('Descrição do KR');
        expect(kr.metricType).toBe('currency');
        expect(kr.startValue).toBe(1000);
        expect(kr.targetValue).toBe(5000);
        expect(kr.currentValue).toBe(3000);
        expect(kr.unit).toBe('BRL');
        expect(kr.status).toBe('on_track');
        expect(kr.weight).toBe(50);
        expect(kr.order).toBe(3);
        expect(kr.linkedKpiId).toBe('kpi-123');
        expect(kr.linkedActionPlanId).toBe('ap-456');
      }
    });
  });

  // ============================================================================
  // toPersistence() Tests
  // ============================================================================

  describe('toPersistence()', () => {
    it('deve converter OKR Domain para OkrInsert', () => {
      const okr = createMockOKR();

      const { okr: okrInsert, keyResults } = OkrMapper.toPersistence(okr);

      expect(okrInsert.id).toBe(mockUUID);
      expect(okrInsert.title).toBe('Objetivo para teste');
      expect(okrInsert.description).toBe('Descrição do objetivo');
      expect(okrInsert.level).toBe('corporate');
      expect(okrInsert.periodType).toBe('quarter');
      expect(okrInsert.status).toBe('draft');
      expect(okrInsert.organizationId).toBe(1);
      expect(okrInsert.branchId).toBe(3);
      expect(keyResults).toHaveLength(0);
    });

    it('deve converter OKR com KeyResults', () => {
      const okr = createMockOKR();
      const kr = createMockKeyResult('KR para persistência');
      okr.addKeyResult(kr);

      const { keyResults } = OkrMapper.toPersistence(okr);

      expect(keyResults).toHaveLength(1);
      expect(keyResults[0].title).toBe('KR para persistência');
    });

    it('deve converter undefined para null', () => {
      const okr = createMockOKR();

      const { okr: okrInsert } = OkrMapper.toPersistence(okr);

      // parentId undefined -> null
      expect(okrInsert.parentId).toBeNull();
      // deletedAt sempre null para novos
      expect(okrInsert.deletedAt).toBeNull();
    });

    it('deve preservar ID do KeyResult existente', () => {
      const okr = createMockOKR();
      const kr = createMockKeyResult('KR com ID', 'kr-existing-id');
      okr.addKeyResult(kr);

      const { keyResults } = OkrMapper.toPersistence(okr);

      expect(keyResults[0].id).toBe('kr-existing-id');
    });

    it('deve ter id undefined para KeyResult novo', () => {
      const okr = createMockOKR();
      const kr = createMockKeyResult('KR novo'); // Sem ID
      okr.addKeyResult(kr);

      const { keyResults } = OkrMapper.toPersistence(okr);

      expect(keyResults[0].id).toBeUndefined();
    });

    it('deve mapear order para orderIndex', () => {
      const okr = createMockOKR();
      
      // Criar KR com order específico
      const krResult = KeyResult.create({
        title: 'KR com order',
        metricType: 'percentage',
        startValue: 0,
        targetValue: 100,
        currentValue: 0,
        unit: '%',
        weight: 100,
        order: 5, // Order específico
      });
      
      if (Result.isOk(krResult)) {
        okr.addKeyResult(krResult.value);
      }

      const { keyResults } = OkrMapper.toPersistence(okr);

      expect(keyResults[0].orderIndex).toBe(5);
    });

    it('deve converter description vazia para null', () => {
      const okrResult = OKR.create({
        title: 'OKR sem descrição',
        description: undefined,
        level: 'corporate',
        periodType: 'quarter',
        periodLabel: 'Q1 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        ownerId: 'user-123',
        ownerName: 'João',
        ownerType: 'user',
        organizationId: 1,
        branchId: 3,
        createdBy: 'admin',
      });

      expect(Result.isOk(okrResult)).toBe(true);
      if (Result.isOk(okrResult)) {
        const { okr: okrInsert } = OkrMapper.toPersistence(okrResult.value);
        expect(okrInsert.description).toBeNull();
      }
    });

    it('deve incluir createdBy do OKR nos KeyResults', () => {
      const okr = createMockOKR();
      const kr = createMockKeyResult('KR');
      okr.addKeyResult(kr);

      const { keyResults } = OkrMapper.toPersistence(okr);

      expect(keyResults[0].createdBy).toBe('admin');
    });
  });

  // ============================================================================
  // Round-trip Tests (Domain -> Persistence -> Domain)
  // ============================================================================

  describe('Round-trip conversion', () => {
    it('deve preservar dados após Domain -> Persistence -> Domain', () => {
      // 1. Criar OKR original
      const originalOKR = createMockOKR();
      originalOKR.addKeyResult(createMockKeyResult('KR1', 'kr-1'));

      // 2. Converter para Persistence
      const { okr: okrInsert, keyResults } = OkrMapper.toPersistence(originalOKR);

      // 3. Simular row do banco (com valores retornados)
      const okrRow: OkrRow = {
        ...okrInsert,
        deletedAt: null,
      } as OkrRow;

      const keyResultRows: KeyResultRow[] = keyResults.map(kr => ({
        ...kr,
        id: kr.id || 'generated-id',
        okrId: okrRow.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as KeyResultRow[];

      // 4. Converter de volta para Domain
      const result = OkrMapper.toDomain(okrRow, keyResultRows);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const reconstituted = result.value;
        
        // Verificar preservação de dados
        expect(reconstituted.id).toBe(originalOKR.id);
        expect(reconstituted.title).toBe(originalOKR.title);
        expect(reconstituted.description).toBe(originalOKR.description);
        expect(reconstituted.level).toBe(originalOKR.level);
        expect(reconstituted.organizationId).toBe(originalOKR.organizationId);
        expect(reconstituted.branchId).toBe(originalOKR.branchId);
        expect(reconstituted.keyResults).toHaveLength(1);
        expect(reconstituted.keyResults[0].title).toBe('KR1');
      }
    });
  });

  // ============================================================================
  // MAPPER-004 Compliance Tests
  // ============================================================================

  describe('MAPPER-004: toDomain uses reconstitute, not create', () => {
    it('deve usar reconstitute (não valida invariantes de criação)', () => {
      // Dados que poderiam falhar em create() mas devem passar em toDomain()
      // Por exemplo: status já é 'completed' (create() sempre começa como 'draft')
      const okrRow = createMockOkrRow({
        status: 'completed',
        progress: 100,
      });
      const keyResultRows: KeyResultRow[] = [];

      const result = OkrMapper.toDomain(okrRow, keyResultRows);

      // Deve funcionar porque reconstitute() não valida
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.status).toBe('completed');
        expect(result.value.progress).toBe(100);
      }
    });
  });
});
