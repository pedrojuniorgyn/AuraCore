/**
 * Unit Tests: KeyResult Value Object
 * 
 * Tests for KeyResult creation, validation, immutability and business methods.
 * 
 * @module tests/unit/modules/strategic/okr/domain/entities
 */
import { describe, it, expect } from 'vitest';
import { KeyResult } from '@/modules/strategic/okr/domain/entities/KeyResult';
import { Result } from '@/shared/domain';

describe('KeyResult Value Object', () => {
  // ============================================================================
  // FIXTURES
  // ============================================================================
  
  const validProps = {
    title: 'Aumentar vendas em 20%',
    description: 'Crescer o faturamento do trimestre',
    metricType: 'percentage' as const,
    startValue: 0,
    targetValue: 100,
    currentValue: 0,
    unit: '%',
    weight: 100,
    order: 0,
  };

  // ============================================================================
  // create() - Factory Method Tests
  // ============================================================================

  describe('create()', () => {
    it('deve criar KeyResult válido com todas as propriedades', () => {
      const result = KeyResult.create(validProps);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.title).toBe('Aumentar vendas em 20%');
        expect(result.value.description).toBe('Crescer o faturamento do trimestre');
        expect(result.value.metricType).toBe('percentage');
        expect(result.value.startValue).toBe(0);
        expect(result.value.targetValue).toBe(100);
        expect(result.value.currentValue).toBe(0);
        expect(result.value.unit).toBe('%');
        expect(result.value.weight).toBe(100);
        expect(result.value.order).toBe(0);
      }
    });

    it('deve criar KeyResult sem description (opcional)', () => {
      const { description, ...propsWithoutDescription } = validProps;

      const result = KeyResult.create(propsWithoutDescription);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.description).toBeUndefined();
      }
    });

    it('deve fazer trim no title', () => {
      const result = KeyResult.create({
        ...validProps,
        title: '  Aumentar vendas  ',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.title).toBe('Aumentar vendas');
      }
    });

    it('deve fazer trim na description', () => {
      const result = KeyResult.create({
        ...validProps,
        description: '  Descrição com espaços  ',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.description).toBe('Descrição com espaços');
      }
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('Validations', () => {
    it('deve rejeitar título vazio', () => {
      const result = KeyResult.create({
        ...validProps,
        title: '',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('title');
      }
    });

    it('deve rejeitar título com apenas espaços', () => {
      const result = KeyResult.create({
        ...validProps,
        title: '   ',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('title');
      }
    });

    it('deve rejeitar título com mais de 200 caracteres', () => {
      const result = KeyResult.create({
        ...validProps,
        title: 'A'.repeat(201),
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('200');
      }
    });

    it('deve aceitar título com exatamente 200 caracteres', () => {
      const result = KeyResult.create({
        ...validProps,
        title: 'A'.repeat(200),
      });

      expect(Result.isOk(result)).toBe(true);
    });

    it('deve rejeitar description com mais de 1000 caracteres', () => {
      const result = KeyResult.create({
        ...validProps,
        description: 'A'.repeat(1001),
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('1000');
      }
    });

    it('deve rejeitar weight menor que 0', () => {
      const result = KeyResult.create({
        ...validProps,
        weight: -1,
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('weight');
      }
    });

    it('deve rejeitar weight maior que 100', () => {
      const result = KeyResult.create({
        ...validProps,
        weight: 101,
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('weight');
      }
    });

    it('deve aceitar weight = 0', () => {
      const result = KeyResult.create({
        ...validProps,
        weight: 0,
      });

      expect(Result.isOk(result)).toBe(true);
    });

    it('deve aceitar weight = 100', () => {
      const result = KeyResult.create({
        ...validProps,
        weight: 100,
      });

      expect(Result.isOk(result)).toBe(true);
    });

    it('deve rejeitar order negativo', () => {
      const result = KeyResult.create({
        ...validProps,
        order: -1,
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('order');
      }
    });
  });

  // ============================================================================
  // Progress Calculation Tests
  // ============================================================================

  describe('progress getter', () => {
    it('deve calcular progresso 0% quando currentValue = startValue', () => {
      const result = KeyResult.create({
        ...validProps,
        startValue: 0,
        targetValue: 100,
        currentValue: 0,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.progress).toBe(0);
      }
    });

    it('deve calcular progresso 50% quando está na metade', () => {
      const result = KeyResult.create({
        ...validProps,
        startValue: 0,
        targetValue: 100,
        currentValue: 50,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.progress).toBe(50);
      }
    });

    it('deve calcular progresso 100% quando currentValue = targetValue', () => {
      const result = KeyResult.create({
        ...validProps,
        startValue: 0,
        targetValue: 100,
        currentValue: 100,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.progress).toBe(100);
      }
    });

    it('deve limitar progresso a 100% quando excede target', () => {
      const result = KeyResult.create({
        ...validProps,
        startValue: 0,
        targetValue: 100,
        currentValue: 150,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.progress).toBe(100);
      }
    });

    it('deve retornar 100% quando start = target', () => {
      const result = KeyResult.create({
        ...validProps,
        startValue: 100,
        targetValue: 100,
        currentValue: 100,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.progress).toBe(100);
      }
    });

    it('deve calcular progresso com valores não-zero de start', () => {
      // Start: 50, Target: 100, Current: 75
      // Range: 50, Progress: (75-50)/50 = 50%
      const result = KeyResult.create({
        ...validProps,
        startValue: 50,
        targetValue: 100,
        currentValue: 75,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.progress).toBe(50);
      }
    });

    it('deve arredondar progresso para inteiro', () => {
      // Start: 0, Target: 100, Current: 33
      // Progress: 33/100 = 33%
      const result = KeyResult.create({
        ...validProps,
        startValue: 0,
        targetValue: 100,
        currentValue: 33,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.progress).toBe(33);
      }
    });
  });

  // ============================================================================
  // Status Calculation Tests
  // ============================================================================

  describe('Status calculation (auto)', () => {
    it('deve calcular status "not_started" quando progress = 0', () => {
      const result = KeyResult.create({
        ...validProps,
        startValue: 0,
        targetValue: 100,
        currentValue: 0,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.status).toBe('not_started');
      }
    });

    it('deve calcular status "behind" quando progress < 40%', () => {
      const result = KeyResult.create({
        ...validProps,
        startValue: 0,
        targetValue: 100,
        currentValue: 30,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.status).toBe('behind');
      }
    });

    it('deve calcular status "at_risk" quando 40% <= progress < 70%', () => {
      const result = KeyResult.create({
        ...validProps,
        startValue: 0,
        targetValue: 100,
        currentValue: 50,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.status).toBe('at_risk');
      }
    });

    it('deve calcular status "on_track" quando 70% <= progress < 100%', () => {
      const result = KeyResult.create({
        ...validProps,
        startValue: 0,
        targetValue: 100,
        currentValue: 85,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.status).toBe('on_track');
      }
    });

    it('deve calcular status "completed" quando progress = 100%', () => {
      const result = KeyResult.create({
        ...validProps,
        startValue: 0,
        targetValue: 100,
        currentValue: 100,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.status).toBe('completed');
      }
    });

    it('deve respeitar status fornecido explicitamente', () => {
      const result = KeyResult.create({
        ...validProps,
        startValue: 0,
        targetValue: 100,
        currentValue: 0,
        status: 'on_track', // Forçar status
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.status).toBe('on_track');
      }
    });
  });

  // ============================================================================
  // Immutability Tests (VO-005, VO-006)
  // ============================================================================

  describe('Immutability (VO-005, VO-006)', () => {
    it('deve ser imutável (Object.freeze)', () => {
      const result = KeyResult.create(validProps);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const kr = result.value;
        
        // Tentar modificar deve falhar silenciosamente ou lançar erro
        expect(() => {
          (kr as unknown as Record<string, unknown>).title = 'Modificado';
        }).toThrow();
      }
    });

    it('não deve ter setters públicos', () => {
      const result = KeyResult.create(validProps);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const kr = result.value;
        
        // Verificar que não existem métodos set*
        expect(typeof (kr as unknown as Record<string, unknown>).setTitle).toBe('undefined');
        expect(typeof (kr as unknown as Record<string, unknown>).setCurrentValue).toBe('undefined');
        expect(typeof (kr as unknown as Record<string, unknown>).setStatus).toBe('undefined');
      }
    });
  });

  // ============================================================================
  // withCurrentValue() Tests
  // ============================================================================

  describe('withCurrentValue()', () => {
    it('deve retornar nova instância com currentValue atualizado', () => {
      const createResult = KeyResult.create(validProps);
      expect(Result.isOk(createResult)).toBe(true);
      
      if (Result.isOk(createResult)) {
        const kr = createResult.value;
        const updateResult = kr.withCurrentValue(75);

        expect(Result.isOk(updateResult)).toBe(true);
        if (Result.isOk(updateResult)) {
          const updated = updateResult.value;
          
          // Nova instância
          expect(updated).not.toBe(kr);
          
          // Valor atualizado
          expect(updated.currentValue).toBe(75);
          
          // Original não modificado
          expect(kr.currentValue).toBe(0);
        }
      }
    });

    it('deve recalcular status automaticamente', () => {
      const createResult = KeyResult.create({
        ...validProps,
        currentValue: 0, // Começa not_started
      });

      expect(Result.isOk(createResult)).toBe(true);
      if (Result.isOk(createResult)) {
        const kr = createResult.value;
        expect(kr.status).toBe('not_started');

        const updateResult = kr.withCurrentValue(100);
        expect(Result.isOk(updateResult)).toBe(true);
        if (Result.isOk(updateResult)) {
          expect(updateResult.value.status).toBe('completed');
        }
      }
    });

    it('deve rejeitar currentValue negativo', () => {
      const createResult = KeyResult.create(validProps);
      expect(Result.isOk(createResult)).toBe(true);
      
      if (Result.isOk(createResult)) {
        const kr = createResult.value;
        const updateResult = kr.withCurrentValue(-10);

        expect(Result.isFail(updateResult)).toBe(true);
        if (Result.isFail(updateResult)) {
          expect(updateResult.error).toContain('negativo');
        }
      }
    });
  });

  // ============================================================================
  // withStatus() Tests
  // ============================================================================

  describe('withStatus()', () => {
    it('deve retornar nova instância com status atualizado', () => {
      const createResult = KeyResult.create({
        ...validProps,
        status: 'not_started',
      });
      
      expect(Result.isOk(createResult)).toBe(true);
      if (Result.isOk(createResult)) {
        const kr = createResult.value;
        const updateResult = kr.withStatus('completed');

        expect(Result.isOk(updateResult)).toBe(true);
        if (Result.isOk(updateResult)) {
          const updated = updateResult.value;
          
          // Nova instância
          expect(updated).not.toBe(kr);
          
          // Status atualizado
          expect(updated.status).toBe('completed');
          
          // Original não modificado
          expect(kr.status).toBe('not_started');
        }
      }
    });
  });

  // ============================================================================
  // Metric Types Tests
  // ============================================================================

  describe('Metric Types', () => {
    const metricTypes = ['number', 'percentage', 'currency', 'boolean'] as const;

    metricTypes.forEach(metricType => {
      it(`deve aceitar metricType "${metricType}"`, () => {
        const result = KeyResult.create({
          ...validProps,
          metricType,
        });

        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.metricType).toBe(metricType);
        }
      });
    });
  });

  // ============================================================================
  // Optional Fields Tests
  // ============================================================================

  describe('Optional Fields', () => {
    it('deve aceitar linkedKpiId', () => {
      const result = KeyResult.create({
        ...validProps,
        linkedKpiId: 'kpi-123',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.linkedKpiId).toBe('kpi-123');
      }
    });

    it('deve aceitar linkedActionPlanId', () => {
      const result = KeyResult.create({
        ...validProps,
        linkedActionPlanId: 'action-456',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.linkedActionPlanId).toBe('action-456');
      }
    });

    it('deve aceitar id para Key Results existentes', () => {
      const result = KeyResult.create({
        ...validProps,
        id: 'kr-789',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe('kr-789');
      }
    });
  });
});
