import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PayAccountPayableUseCase } from '@/modules/financial/application/commands/PayAccountPayableUseCase';
import { IPayableRepository } from '@/modules/financial/domain/ports/output/IPayableRepository';
import { AccountPayable } from '@/modules/financial/domain/entities/AccountPayable';
import { PaymentTerms } from '@/modules/financial/domain/value-objects/PaymentTerms';
import { Money, Result } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import { ExecutionContext } from '@/modules/financial/application/use-cases/BaseUseCase';

describe('PayAccountPayableUseCase', () => {
  let useCase: PayAccountPayableUseCase;
  let mockRepository: IPayableRepository;
  let mockUuidGenerator: IUuidGenerator;
  let mockEventPublisher: IEventPublisher;
  let ctx: ExecutionContext;
  let existingPayable: AccountPayable;

  beforeEach(async () => {
    // Criar payable existente
    const moneyResult = Money.create(1000);
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    
    const termsResult = PaymentTerms.create({
      dueDate: futureDate,
      amount: moneyResult.value!,
    });

    const payableResult = AccountPayable.create({
      id: '550e8400-e29b-41d4-a716-446655440000',
      organizationId: 1,
      branchId: 1,
      supplierId: 100,
      documentNumber: 'NF-12345',
      description: 'Test',
      terms: termsResult.value!,
    });

    existingPayable = payableResult.value!;

    // Mock repository - filtra por branchId (ENFORCE-004)
    mockRepository = {
      findById: vi.fn().mockImplementation(async (id, _orgId, branchId) => {
        // Repository filtra por branchId - só retorna se branch bater
        if (id === existingPayable.id && branchId === existingPayable.branchId) {
          return existingPayable;
        }
        return null;
      }),
      findMany: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      findOverdue: vi.fn(),
      findBySupplier: vi.fn(),
      exists: vi.fn(),
      nextDocumentNumber: vi.fn(),
    };

    // Mock UUID generator
    mockUuidGenerator = {
      generate: vi.fn().mockReturnValue('00000001-0000-4000-8000-000000000000'),
    };

    // Mock EventPublisher (F1.4)
    mockEventPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
      publishBatch: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      getHandlers: vi.fn().mockReturnValue([]),
    } as unknown as IEventPublisher;

    useCase = new PayAccountPayableUseCase(mockRepository, mockUuidGenerator, mockEventPublisher);

    ctx = {
      userId: 'user-001',
      organizationId: 1,
      branchId: 1,
      isAdmin: false,
    };
  });

  describe('execute', () => {
    const validInput = {
      payableId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 1000,
      currency: 'BRL',
      method: 'PIX' as const,
      autoConfirm: true,
    };

    it('should pay payable successfully', async () => {
      const result = await useCase.execute(validInput, ctx);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.payableStatus).toBe('PAID');
        expect(result.value.paymentStatus).toBe('CONFIRMED');
        expect(result.value.totalPaid).toBe(1000);
        expect(result.value.remainingAmount).toBe(0);
      }
    });

    it('should fail if payable not found', async () => {
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await useCase.execute(validInput, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('not found');
      }
    });

    it('should fail if branch mismatch for non-admin', async () => {
      // Com multi-tenancy completo, o repository filtra por branchId
      // Documento de branch 1 não é encontrado quando busca com branchId: 999
      const result = await useCase.execute(validInput, {
        ...ctx,
        branchId: 999, // Diferente do payable
        isAdmin: false,
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        // Repository retorna null quando branchId não bate
        expect(result.error).toContain('not found');
      }
    });

    it('should allow admin to pay same branch', async () => {
      // Admin também precisa estar na mesma branch para acessar o documento
      // (multi-tenancy é enforçado no repository)
      const result = await useCase.execute(validInput, {
        ...ctx,
        branchId: 1, // Mesma branch do payable
        isAdmin: true,
      });

      expect(Result.isOk(result)).toBe(true);
    });

    it('should create PENDING payment if autoConfirm is false', async () => {
      const result = await useCase.execute({
        ...validInput,
        autoConfirm: false,
      }, ctx);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.paymentStatus).toBe('PENDING');
        expect(result.value.payableStatus).toBe('OPEN'); // Não muda sem confirmação
      }
    });
  });
});

