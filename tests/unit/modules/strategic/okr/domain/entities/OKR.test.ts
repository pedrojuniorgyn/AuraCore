/**
 * Unit Tests: OKR Aggregate Root
 * 
 * Tests for OKR creation, validation, business methods, and state transitions.
 * 
 * @module tests/unit/modules/strategic/okr/domain/entities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OKR } from '@/modules/strategic/okr/domain/entities/OKR';
import { KeyResult } from '@/modules/strategic/okr/domain/entities/KeyResult';
import { Result } from '@/shared/domain';

describe('OKR Aggregate Root', () => {
  // ============================================================================
  // FIXTURES
  // ============================================================================
  
  const createValidOKRProps = () => ({
    title: 'Aumentar receita em 30%',
    description: 'Objetivo corporativo para o Q1 2026',
    level: 'corporate' as const,
    parentId: undefined,
    periodType: 'quarter' as const,
    periodLabel: 'Q1 2026',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-03-31'),
    ownerId: 'user-123',
    ownerName: 'João Silva',
    ownerType: 'user' as const,
    organizationId: 1,
    branchId: 3,
    createdBy: 'admin-001',
  });

  const createKeyResult = (title: string, progress: number = 0, weight: number = 100, order: number = 0) => {
    const result = KeyResult.create({
      title,
      metricType: 'percentage' as const,
      startValue: 0,
      targetValue: 100,
      currentValue: progress,
      unit: '%',
      weight,
      order,
    });
    
    if (Result.isFail(result)) {
      throw new Error(`Failed to create KeyResult: ${result.error}`);
    }
    return result.value;
  };

  // Mock crypto.randomUUID for predictable IDs in tests
  const mockUUID = 'test-uuid-1234';
  
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue(mockUUID),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ============================================================================
  // create() - Factory Method Tests
  // ============================================================================

  describe('create()', () => {
    it('deve criar OKR válido com todas as propriedades', () => {
      const props = createValidOKRProps();
      const result = OKR.create(props);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const okr = result.value;
        expect(okr.title).toBe('Aumentar receita em 30%');
        expect(okr.description).toBe('Objetivo corporativo para o Q1 2026');
        expect(okr.level).toBe('corporate');
        expect(okr.periodType).toBe('quarter');
        expect(okr.periodLabel).toBe('Q1 2026');
        expect(okr.ownerId).toBe('user-123');
        expect(okr.ownerName).toBe('João Silva');
        expect(okr.ownerType).toBe('user');
        expect(okr.organizationId).toBe(1);
        expect(okr.branchId).toBe(3);
        expect(okr.createdBy).toBe('admin-001');
      }
    });

    it('deve iniciar com status "draft"', () => {
      const result = OKR.create(createValidOKRProps());

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.status).toBe('draft');
      }
    });

    it('deve iniciar com progresso 0', () => {
      const result = OKR.create(createValidOKRProps());

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.progress).toBe(0);
      }
    });

    it('deve iniciar com keyResults vazio', () => {
      const result = OKR.create(createValidOKRProps());

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.keyResults).toHaveLength(0);
      }
    });

    it('deve gerar ID automaticamente', () => {
      const result = OKR.create(createValidOKRProps());

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe(mockUUID);
      }
    });

    it('deve emitir evento OKR_CREATED', () => {
      const result = OKR.create(createValidOKRProps());

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const events = result.value.domainEvents;
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe('OKR_CREATED');
      }
    });

    it('deve fazer trim no title', () => {
      const props = { ...createValidOKRProps(), title: '  Objetivo com espaços  ' };
      const result = OKR.create(props);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.title).toBe('Objetivo com espaços');
      }
    });

    it('deve aceitar description undefined', () => {
      const props = { ...createValidOKRProps(), description: undefined };
      const result = OKR.create(props);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.description).toBeUndefined();
      }
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('Validations', () => {
    it('deve rejeitar título vazio', () => {
      const props = { ...createValidOKRProps(), title: '' };
      const result = OKR.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('title');
      }
    });

    it('deve rejeitar título com apenas espaços', () => {
      const props = { ...createValidOKRProps(), title: '   ' };
      const result = OKR.create(props);

      expect(Result.isFail(result)).toBe(true);
    });

    it('deve rejeitar título com mais de 200 caracteres', () => {
      const props = { ...createValidOKRProps(), title: 'A'.repeat(201) };
      const result = OKR.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('200');
      }
    });

    it('deve rejeitar description com mais de 1000 caracteres', () => {
      const props = { ...createValidOKRProps(), description: 'A'.repeat(1001) };
      const result = OKR.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('1000');
      }
    });

    it('deve rejeitar endDate anterior a startDate', () => {
      const props = {
        ...createValidOKRProps(),
        startDate: new Date('2026-03-31'),
        endDate: new Date('2026-01-01'),
      };
      const result = OKR.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('date');
      }
    });

    it('deve rejeitar endDate igual a startDate', () => {
      const props = {
        ...createValidOKRProps(),
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-01'),
      };
      const result = OKR.create(props);

      expect(Result.isFail(result)).toBe(true);
    });

    it('deve rejeitar organizationId inválido (0)', () => {
      const props = { ...createValidOKRProps(), organizationId: 0 };
      const result = OKR.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Organization');
      }
    });

    it('deve rejeitar organizationId negativo', () => {
      const props = { ...createValidOKRProps(), organizationId: -1 };
      const result = OKR.create(props);

      expect(Result.isFail(result)).toBe(true);
    });

    it('deve rejeitar branchId inválido (0)', () => {
      const props = { ...createValidOKRProps(), branchId: 0 };
      const result = OKR.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Branch');
      }
    });

    it('deve rejeitar ownerId vazio', () => {
      const props = { ...createValidOKRProps(), ownerId: '' };
      const result = OKR.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Owner');
      }
    });

    it('deve rejeitar ownerName vazio', () => {
      const props = { ...createValidOKRProps(), ownerName: '  ' };
      const result = OKR.create(props);

      expect(Result.isFail(result)).toBe(true);
    });

    it('deve rejeitar createdBy vazio', () => {
      const props = { ...createValidOKRProps(), createdBy: '' };
      const result = OKR.create(props);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Created by');
      }
    });
  });

  // ============================================================================
  // reconstitute() - Factory Method Tests
  // ============================================================================

  describe('reconstitute()', () => {
    it('deve reconstituir OKR sem validações', () => {
      // Usando dados que poderiam falhar em create() mas devem passar em reconstitute()
      const result = OKR.reconstitute({
        id: 'existing-id-123',
        title: 'Título existente',
        description: undefined,
        level: 'corporate',
        parentId: undefined,
        periodType: 'quarter',
        periodLabel: 'Q1 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        ownerId: 'user-123',
        ownerName: 'João',
        ownerType: 'user',
        keyResults: [],
        progress: 50,
        status: 'active',
        organizationId: 1,
        branchId: 3,
        createdBy: 'admin',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-02-01'),
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe('existing-id-123');
        expect(result.value.status).toBe('active');
        expect(result.value.progress).toBe(50);
      }
    });

    it('deve preservar keyResults existentes', () => {
      const kr = createKeyResult('KR1', 50);
      
      const result = OKR.reconstitute({
        id: 'existing-id',
        title: 'OKR',
        description: undefined,
        level: 'corporate',
        parentId: undefined,
        periodType: 'quarter',
        periodLabel: 'Q1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        ownerId: 'user',
        ownerName: 'User',
        ownerType: 'user',
        keyResults: [kr],
        progress: 50,
        status: 'active',
        organizationId: 1,
        branchId: 1,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.keyResults).toHaveLength(1);
        expect(result.value.keyResults[0].title).toBe('KR1');
      }
    });
  });

  // ============================================================================
  // addKeyResult() Tests
  // ============================================================================

  describe('addKeyResult()', () => {
    it('deve adicionar Key Result ao OKR', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;
        const kr = createKeyResult('Aumentar conversão', 0);

        const addResult = okr.addKeyResult(kr);

        expect(Result.isOk(addResult)).toBe(true);
        expect(okr.keyResults).toHaveLength(1);
        expect(okr.keyResults[0].title).toBe('Aumentar conversão');
      }
    });

    it('deve emitir evento KEY_RESULT_ADDED', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;
        okr.clearDomainEvents(); // Limpar evento OKR_CREATED
        
        const kr = createKeyResult('KR1');
        okr.addKeyResult(kr);

        const events = okr.domainEvents;
        expect(events.some(e => e.eventType === 'KEY_RESULT_ADDED')).toBe(true);
      }
    });

    it('deve rejeitar mais de 5 Key Results', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;

        // Adicionar 5 KRs
        for (let i = 0; i < 5; i++) {
          const kr = createKeyResult(`KR${i + 1}`, 0, 100, i);
          okr.addKeyResult(kr);
        }

        expect(okr.keyResults).toHaveLength(5);

        // Tentar adicionar o 6º
        const kr6 = createKeyResult('KR6', 0, 100, 5);
        const addResult = okr.addKeyResult(kr6);

        expect(Result.isFail(addResult)).toBe(true);
        if (Result.isFail(addResult)) {
          expect(addResult.error).toContain('5');
        }
        expect(okr.keyResults).toHaveLength(5);
      }
    });

    it('deve atualizar progresso após adicionar Key Result', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;
        expect(okr.progress).toBe(0);

        // Adicionar KR com 50% de progresso
        const kr = createKeyResult('KR1', 50);
        okr.addKeyResult(kr);

        expect(okr.progress).toBe(50);
      }
    });

    it('deve rejeitar se OKR não estiver editável (completed)', () => {
      const okrResult = OKR.reconstitute({
        id: 'id',
        title: 'OKR',
        description: undefined,
        level: 'corporate',
        parentId: undefined,
        periodType: 'quarter',
        periodLabel: 'Q1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        ownerId: 'user',
        ownerName: 'User',
        ownerType: 'user',
        keyResults: [createKeyResult('KR1')],
        progress: 100,
        status: 'completed', // Não editável
        organizationId: 1,
        branchId: 1,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(Result.isOk(okrResult)).toBe(true);
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;
        const kr = createKeyResult('Novo KR');

        const addResult = okr.addKeyResult(kr);

        expect(Result.isFail(addResult)).toBe(true);
        if (Result.isFail(addResult)) {
          expect(addResult.error).toContain('editável');
        }
      }
    });
  });

  // ============================================================================
  // calculateProgress() Tests
  // ============================================================================

  describe('calculateProgress()', () => {
    it('deve retornar 0 quando não há Key Results', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        expect(okrResult.value.calculateProgress()).toBe(0);
      }
    });

    it('deve calcular média simples quando pesos são iguais', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;

        // KR1: 50%, peso 100
        // KR2: 100%, peso 100
        // Média: (50 + 100) / 2 = 75%
        okr.addKeyResult(createKeyResult('KR1', 50, 100, 0));
        okr.addKeyResult(createKeyResult('KR2', 100, 100, 1));

        expect(okr.calculateProgress()).toBe(75);
      }
    });

    it('deve calcular média ponderada quando pesos são diferentes', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;

        // KR1: 100%, peso 30
        // KR2: 0%, peso 70
        // Ponderado: (100*30 + 0*70) / (30+70) = 30%
        okr.addKeyResult(createKeyResult('KR1', 100, 30, 0));
        okr.addKeyResult(createKeyResult('KR2', 0, 70, 1));

        expect(okr.calculateProgress()).toBe(30);
      }
    });

    it('deve usar média simples quando total de pesos é 0', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;

        // KR1: 50%, peso 0
        // KR2: 100%, peso 0
        // Média simples: (50 + 100) / 2 = 75%
        okr.addKeyResult(createKeyResult('KR1', 50, 0, 0));
        okr.addKeyResult(createKeyResult('KR2', 100, 0, 1));

        expect(okr.calculateProgress()).toBe(75);
      }
    });
  });

  // ============================================================================
  // State Transitions Tests
  // ============================================================================

  describe('activate()', () => {
    it('deve transicionar de draft para active', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;
        okr.addKeyResult(createKeyResult('KR1')); // Precisa de pelo menos 1 KR

        const activateResult = okr.activate();

        expect(Result.isOk(activateResult)).toBe(true);
        expect(okr.status).toBe('active');
      }
    });

    it('deve emitir evento OKR_ACTIVATED', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;
        okr.addKeyResult(createKeyResult('KR1'));
        okr.clearDomainEvents();

        okr.activate();

        const events = okr.domainEvents;
        expect(events.some(e => e.eventType === 'OKR_ACTIVATED')).toBe(true);
      }
    });

    it('deve rejeitar se não houver Key Results', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;
        // Sem Key Results

        const activateResult = okr.activate();

        expect(Result.isFail(activateResult)).toBe(true);
        if (Result.isFail(activateResult)) {
          expect(activateResult.error).toContain('Key Result');
        }
      }
    });

    it('deve rejeitar se já estiver active', () => {
      const okrResult = OKR.reconstitute({
        id: 'id',
        title: 'OKR',
        description: undefined,
        level: 'corporate',
        parentId: undefined,
        periodType: 'quarter',
        periodLabel: 'Q1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        ownerId: 'user',
        ownerName: 'User',
        ownerType: 'user',
        keyResults: [createKeyResult('KR1')],
        progress: 0,
        status: 'active', // Já active
        organizationId: 1,
        branchId: 1,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(Result.isOk(okrResult)).toBe(true);
      if (Result.isOk(okrResult)) {
        const activateResult = okrResult.value.activate();

        expect(Result.isFail(activateResult)).toBe(true);
        if (Result.isFail(activateResult)) {
          expect(activateResult.error).toContain('active');
        }
      }
    });
  });

  describe('complete()', () => {
    it('deve transicionar de active para completed', () => {
      const okrResult = OKR.reconstitute({
        id: 'id',
        title: 'OKR',
        description: undefined,
        level: 'corporate',
        parentId: undefined,
        periodType: 'quarter',
        periodLabel: 'Q1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        ownerId: 'user',
        ownerName: 'User',
        ownerType: 'user',
        keyResults: [createKeyResult('KR1', 100)],
        progress: 100,
        status: 'active',
        organizationId: 1,
        branchId: 1,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(Result.isOk(okrResult)).toBe(true);
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;

        const completeResult = okr.complete();

        expect(Result.isOk(completeResult)).toBe(true);
        expect(okr.status).toBe('completed');
      }
    });

    it('deve emitir evento OKR_COMPLETED', () => {
      const okrResult = OKR.reconstitute({
        id: 'id',
        title: 'OKR',
        description: undefined,
        level: 'corporate',
        parentId: undefined,
        periodType: 'quarter',
        periodLabel: 'Q1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        ownerId: 'user',
        ownerName: 'User',
        ownerType: 'user',
        keyResults: [createKeyResult('KR1', 100)],
        progress: 100,
        status: 'active',
        organizationId: 1,
        branchId: 1,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(Result.isOk(okrResult)).toBe(true);
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;
        okr.clearDomainEvents();

        okr.complete();

        expect(okr.domainEvents.some(e => e.eventType === 'OKR_COMPLETED')).toBe(true);
      }
    });

    it('deve rejeitar se não estiver active', () => {
      const okrResult = OKR.create(createValidOKRProps()); // draft
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const completeResult = okrResult.value.complete();

        expect(Result.isFail(completeResult)).toBe(true);
        if (Result.isFail(completeResult)) {
          expect(completeResult.error).toContain('draft');
        }
      }
    });
  });

  describe('cancel()', () => {
    it('deve cancelar OKR draft', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;

        const cancelResult = okr.cancel('Mudança de prioridades');

        expect(Result.isOk(cancelResult)).toBe(true);
        expect(okr.status).toBe('cancelled');
      }
    });

    it('deve cancelar OKR active', () => {
      const okrResult = OKR.reconstitute({
        id: 'id',
        title: 'OKR',
        description: undefined,
        level: 'corporate',
        parentId: undefined,
        periodType: 'quarter',
        periodLabel: 'Q1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        ownerId: 'user',
        ownerName: 'User',
        ownerType: 'user',
        keyResults: [createKeyResult('KR1')],
        progress: 0,
        status: 'active',
        organizationId: 1,
        branchId: 1,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(Result.isOk(okrResult)).toBe(true);
      if (Result.isOk(okrResult)) {
        const cancelResult = okrResult.value.cancel('Cancelado por gestão');

        expect(Result.isOk(cancelResult)).toBe(true);
        expect(okrResult.value.status).toBe('cancelled');
      }
    });

    it('deve emitir evento OKR_CANCELLED', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;
        okr.clearDomainEvents();

        okr.cancel('Razão do cancelamento');

        expect(okr.domainEvents.some(e => e.eventType === 'OKR_CANCELLED')).toBe(true);
      }
    });

    it('deve rejeitar se já estiver completed', () => {
      const okrResult = OKR.reconstitute({
        id: 'id',
        title: 'OKR',
        description: undefined,
        level: 'corporate',
        parentId: undefined,
        periodType: 'quarter',
        periodLabel: 'Q1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        ownerId: 'user',
        ownerName: 'User',
        ownerType: 'user',
        keyResults: [createKeyResult('KR1', 100)],
        progress: 100,
        status: 'completed',
        organizationId: 1,
        branchId: 1,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(Result.isOk(okrResult)).toBe(true);
      if (Result.isOk(okrResult)) {
        const cancelResult = okrResult.value.cancel();

        expect(Result.isFail(cancelResult)).toBe(true);
        if (Result.isFail(cancelResult)) {
          expect(cancelResult.error).toContain('completed');
        }
      }
    });

    it('deve rejeitar se já estiver cancelled', () => {
      const okrResult = OKR.reconstitute({
        id: 'id',
        title: 'OKR',
        description: undefined,
        level: 'corporate',
        parentId: undefined,
        periodType: 'quarter',
        periodLabel: 'Q1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        ownerId: 'user',
        ownerName: 'User',
        ownerType: 'user',
        keyResults: [],
        progress: 0,
        status: 'cancelled',
        organizationId: 1,
        branchId: 1,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(Result.isOk(okrResult)).toBe(true);
      if (Result.isOk(okrResult)) {
        const cancelResult = okrResult.value.cancel();

        expect(Result.isFail(cancelResult)).toBe(true);
      }
    });
  });

  // ============================================================================
  // updateDetails() Tests
  // ============================================================================

  describe('updateDetails()', () => {
    it('deve atualizar title', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;

        const updateResult = okr.updateDetails({ title: 'Novo Título' });

        expect(Result.isOk(updateResult)).toBe(true);
        expect(okr.title).toBe('Novo Título');
      }
    });

    it('deve atualizar description', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;

        const updateResult = okr.updateDetails({ description: 'Nova descrição' });

        expect(Result.isOk(updateResult)).toBe(true);
        expect(okr.description).toBe('Nova descrição');
      }
    });

    it('deve atualizar endDate', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;
        const newEndDate = new Date('2026-06-30');

        const updateResult = okr.updateDetails({ endDate: newEndDate });

        expect(Result.isOk(updateResult)).toBe(true);
        expect(okr.endDate).toEqual(newEndDate);
      }
    });

    it('deve rejeitar title vazio', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const updateResult = okrResult.value.updateDetails({ title: '' });

        expect(Result.isFail(updateResult)).toBe(true);
        if (Result.isFail(updateResult)) {
          expect(updateResult.error).toContain('vazio');
        }
      }
    });

    it('deve rejeitar endDate anterior a startDate', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;

        const updateResult = okr.updateDetails({ 
          endDate: new Date('2025-12-31'), // Antes de startDate
        });

        expect(Result.isFail(updateResult)).toBe(true);
        if (Result.isFail(updateResult)) {
          expect(updateResult.error).toContain('date');
        }
      }
    });

    it('deve rejeitar se OKR não estiver editável', () => {
      const okrResult = OKR.reconstitute({
        id: 'id',
        title: 'OKR',
        description: undefined,
        level: 'corporate',
        parentId: undefined,
        periodType: 'quarter',
        periodLabel: 'Q1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        ownerId: 'user',
        ownerName: 'User',
        ownerType: 'user',
        keyResults: [],
        progress: 0,
        status: 'completed', // Não editável
        organizationId: 1,
        branchId: 1,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(Result.isOk(okrResult)).toBe(true);
      if (Result.isOk(okrResult)) {
        const updateResult = okrResult.value.updateDetails({ title: 'Novo' });

        expect(Result.isFail(updateResult)).toBe(true);
        if (Result.isFail(updateResult)) {
          expect(updateResult.error).toContain('editável');
        }
      }
    });
  });

  // ============================================================================
  // Computed Properties Tests
  // ============================================================================

  describe('Computed Properties', () => {
    describe('isEditable', () => {
      it('deve retornar true para status draft', () => {
        const okrResult = OKR.create(createValidOKRProps());
        expect(Result.isOk(okrResult)).toBe(true);
        
        if (Result.isOk(okrResult)) {
          expect(okrResult.value.isEditable).toBe(true);
        }
      });

      it('deve retornar true para status active', () => {
        const okrResult = OKR.reconstitute({
          id: 'id',
          title: 'OKR',
          description: undefined,
          level: 'corporate',
          parentId: undefined,
          periodType: 'quarter',
          periodLabel: 'Q1',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-03-31'),
          ownerId: 'user',
          ownerName: 'User',
          ownerType: 'user',
          keyResults: [],
          progress: 0,
          status: 'active',
          organizationId: 1,
          branchId: 1,
          createdBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        expect(Result.isOk(okrResult)).toBe(true);
        if (Result.isOk(okrResult)) {
          expect(okrResult.value.isEditable).toBe(true);
        }
      });

      it('deve retornar false para status completed', () => {
        const okrResult = OKR.reconstitute({
          id: 'id',
          title: 'OKR',
          description: undefined,
          level: 'corporate',
          parentId: undefined,
          periodType: 'quarter',
          periodLabel: 'Q1',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-03-31'),
          ownerId: 'user',
          ownerName: 'User',
          ownerType: 'user',
          keyResults: [],
          progress: 0,
          status: 'completed',
          organizationId: 1,
          branchId: 1,
          createdBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        expect(Result.isOk(okrResult)).toBe(true);
        if (Result.isOk(okrResult)) {
          expect(okrResult.value.isEditable).toBe(false);
        }
      });

      it('deve retornar false para status cancelled', () => {
        const okrResult = OKR.reconstitute({
          id: 'id',
          title: 'OKR',
          description: undefined,
          level: 'corporate',
          parentId: undefined,
          periodType: 'quarter',
          periodLabel: 'Q1',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-03-31'),
          ownerId: 'user',
          ownerName: 'User',
          ownerType: 'user',
          keyResults: [],
          progress: 0,
          status: 'cancelled',
          organizationId: 1,
          branchId: 1,
          createdBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        expect(Result.isOk(okrResult)).toBe(true);
        if (Result.isOk(okrResult)) {
          expect(okrResult.value.isEditable).toBe(false);
        }
      });
    });

    describe('isOverdue', () => {
      it('deve retornar true quando endDate < hoje e não completed', () => {
        const okrResult = OKR.reconstitute({
          id: 'id',
          title: 'OKR',
          description: undefined,
          level: 'corporate',
          parentId: undefined,
          periodType: 'quarter',
          periodLabel: 'Q1',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-31'), // Passado
          ownerId: 'user',
          ownerName: 'User',
          ownerType: 'user',
          keyResults: [],
          progress: 50,
          status: 'active',
          organizationId: 1,
          branchId: 1,
          createdBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        expect(Result.isOk(okrResult)).toBe(true);
        if (Result.isOk(okrResult)) {
          expect(okrResult.value.isOverdue).toBe(true);
        }
      });

      it('deve retornar false quando completed', () => {
        const okrResult = OKR.reconstitute({
          id: 'id',
          title: 'OKR',
          description: undefined,
          level: 'corporate',
          parentId: undefined,
          periodType: 'quarter',
          periodLabel: 'Q1',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-31'), // Passado
          ownerId: 'user',
          ownerName: 'User',
          ownerType: 'user',
          keyResults: [],
          progress: 100,
          status: 'completed',
          organizationId: 1,
          branchId: 1,
          createdBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        expect(Result.isOk(okrResult)).toBe(true);
        if (Result.isOk(okrResult)) {
          expect(okrResult.value.isOverdue).toBe(false);
        }
      });

      it('deve retornar false quando endDate > hoje', () => {
        const okrResult = OKR.reconstitute({
          id: 'id',
          title: 'OKR',
          description: undefined,
          level: 'corporate',
          parentId: undefined,
          periodType: 'quarter',
          periodLabel: 'Q1',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2027-12-31'), // Futuro
          ownerId: 'user',
          ownerName: 'User',
          ownerType: 'user',
          keyResults: [],
          progress: 0,
          status: 'active',
          organizationId: 1,
          branchId: 1,
          createdBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        expect(Result.isOk(okrResult)).toBe(true);
        if (Result.isOk(okrResult)) {
          expect(okrResult.value.isOverdue).toBe(false);
        }
      });
    });
  });

  // ============================================================================
  // keyResults Immutability Tests (ENTITY-005)
  // ============================================================================

  describe('keyResults array immutability (ENTITY-005)', () => {
    it('deve retornar cópia do array keyResults', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;
        okr.addKeyResult(createKeyResult('KR1'));

        const krs1 = okr.keyResults;
        const krs2 = okr.keyResults;

        // Devem ser cópias diferentes
        expect(krs1).not.toBe(krs2);
        // Mas com mesmo conteúdo
        expect(krs1).toEqual(krs2);
      }
    });

    it('mutação externa não deve afetar keyResults interno', () => {
      const okrResult = OKR.create(createValidOKRProps());
      expect(Result.isOk(okrResult)).toBe(true);
      
      if (Result.isOk(okrResult)) {
        const okr = okrResult.value;
        okr.addKeyResult(createKeyResult('KR1'));

        const krs = okr.keyResults as KeyResult[];
        
        // Tentar mutar
        krs.push(createKeyResult('KR2'));

        // Array interno não deve ser afetado
        expect(okr.keyResults).toHaveLength(1);
      }
    });
  });
});
