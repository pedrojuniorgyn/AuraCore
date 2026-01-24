/**
 * 💰 FINANCIAL TITLE GENERATOR - UNIT TESTS
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialTitleGenerator } from '@/modules/financial/application/services/FinancialTitleGenerator';
import { IFinancialTitleRepository, FiscalDocumentData } from '@/modules/financial/domain/ports/output/IFinancialTitleRepository';
import { Result } from '@/shared/domain';

// Mock Repository
class MockFinancialTitleRepository implements IFinancialTitleRepository {
  getFiscalDocumentById = vi.fn();
  createAccountPayable = vi.fn();
  createAccountReceivable = vi.fn();
  updateFiscalDocumentFinancialStatus = vi.fn();
  hasPaidTitles = vi.fn();
  reverseTitles = vi.fn();
}

describe('FinancialTitleGenerator', () => {
  let generator: FinancialTitleGenerator;
  let mockRepository: MockFinancialTitleRepository;

  beforeEach(() => {
    mockRepository = new MockFinancialTitleRepository();
    generator = new FinancialTitleGenerator(mockRepository);
  });

  describe('generatePayable', () => {
    it('deve gerar conta a pagar para documento PURCHASE', async () => {
      const fiscalDocumentId = BigInt(1);
      const organizationId = BigInt(10);
      const userId = 'user-123';

      const mockDocument: FiscalDocumentData = {
        id: fiscalDocumentId,
        organizationId,
        branchId: BigInt(1),
        partnerId: BigInt(100),
        partnerName: 'Fornecedor Teste',
        documentNumber: '12345',
        documentType: 'NFE',
        issueDate: new Date('2024-01-01'),
        netAmount: 1000.00,
        fiscalClassification: 'PURCHASE',
        financialStatus: 'NO_TITLE',
      };

      const payableId = BigInt(500);

      mockRepository.getFiscalDocumentById.mockResolvedValue(Result.ok(mockDocument));
      mockRepository.createAccountPayable.mockResolvedValue(Result.ok(payableId));
      mockRepository.updateFiscalDocumentFinancialStatus.mockResolvedValue(Result.ok(undefined));

      const result = await generator.generatePayable({
        fiscalDocumentId,
        userId,
        organizationId,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.titleId).toBe(payableId);
      expect(result.value.type).toBe('PAYABLE');
      expect(result.value.amount).toBe(1000.00);

      expect(mockRepository.getFiscalDocumentById).toHaveBeenCalledWith(
        fiscalDocumentId,
        organizationId
      );
      expect(mockRepository.createAccountPayable).toHaveBeenCalled();
      expect(mockRepository.updateFiscalDocumentFinancialStatus).toHaveBeenCalledWith(
        fiscalDocumentId,
        'GENERATED',
        organizationId
      );
    });

    it('deve rejeitar documento que não é PURCHASE', async () => {
      const mockDocument: FiscalDocumentData = {
        id: BigInt(1),
        organizationId: BigInt(10),
        branchId: BigInt(1),
        partnerId: BigInt(100),
        partnerName: 'Cliente Teste',
        documentNumber: '12345',
        documentType: 'CTE',
        issueDate: new Date('2024-01-01'),
        netAmount: 1000.00,
        fiscalClassification: 'CARGO',
        financialStatus: 'NO_TITLE',
      };

      mockRepository.getFiscalDocumentById.mockResolvedValue(Result.ok(mockDocument));

      const result = await generator.generatePayable({
        fiscalDocumentId: BigInt(1),
        userId: 'user-123',
        organizationId: BigInt(10),
      });

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('PURCHASE');
    });

    it('deve rejeitar documento que já possui título', async () => {
      const mockDocument: FiscalDocumentData = {
        id: BigInt(1),
        organizationId: BigInt(10),
        branchId: BigInt(1),
        partnerId: BigInt(100),
        partnerName: 'Fornecedor Teste',
        documentNumber: '12345',
        documentType: 'NFE',
        issueDate: new Date('2024-01-01'),
        netAmount: 1000.00,
        fiscalClassification: 'PURCHASE',
        financialStatus: 'GENERATED',
      };

      mockRepository.getFiscalDocumentById.mockResolvedValue(Result.ok(mockDocument));

      const result = await generator.generatePayable({
        fiscalDocumentId: BigInt(1),
        userId: 'user-123',
        organizationId: BigInt(10),
      });

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('já possui título');
    });
  });

  describe('generateReceivable', () => {
    it('deve gerar conta a receber para documento CARGO', async () => {
      const fiscalDocumentId = BigInt(2);
      const organizationId = BigInt(10);
      const userId = 'user-123';

      const mockDocument: FiscalDocumentData = {
        id: fiscalDocumentId,
        organizationId,
        branchId: BigInt(1),
        partnerId: BigInt(200),
        partnerName: 'Cliente Teste',
        documentNumber: '54321',
        documentType: 'CTE',
        issueDate: new Date('2024-01-01'),
        netAmount: 500.00,
        fiscalClassification: 'CARGO',
        financialStatus: 'NO_TITLE',
      };

      const receivableId = BigInt(600);

      mockRepository.getFiscalDocumentById.mockResolvedValue(Result.ok(mockDocument));
      mockRepository.createAccountReceivable.mockResolvedValue(Result.ok(receivableId));
      mockRepository.updateFiscalDocumentFinancialStatus.mockResolvedValue(Result.ok(undefined));

      const result = await generator.generateReceivable({
        fiscalDocumentId,
        userId,
        organizationId,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.titleId).toBe(receivableId);
      expect(result.value.type).toBe('RECEIVABLE');
      expect(result.value.amount).toBe(500.00);
    });
  });

  describe('reverseTitles', () => {
    it('deve reverter títulos de documento que possui títulos', async () => {
      const fiscalDocumentId = BigInt(3);
      const organizationId = BigInt(10);

      const mockDocument: FiscalDocumentData = {
        id: fiscalDocumentId,
        organizationId,
        branchId: BigInt(1),
        partnerId: BigInt(100),
        partnerName: 'Fornecedor Teste',
        documentNumber: '12345',
        documentType: 'NFE',
        issueDate: new Date('2024-01-01'),
        netAmount: 1000.00,
        fiscalClassification: 'PURCHASE',
        financialStatus: 'GENERATED',
      };

      mockRepository.getFiscalDocumentById.mockResolvedValue(Result.ok(mockDocument));
      mockRepository.hasPaidTitles.mockResolvedValue(Result.ok(false));
      mockRepository.reverseTitles.mockResolvedValue(Result.ok(undefined));
      mockRepository.updateFiscalDocumentFinancialStatus.mockResolvedValue(Result.ok(undefined));

      const result = await generator.reverseTitles({
        fiscalDocumentId,
        organizationId,
      });

      expect(result.isSuccess).toBe(true);

      expect(mockRepository.reverseTitles).toHaveBeenCalledWith(
        fiscalDocumentId,
        organizationId
      );
      expect(mockRepository.updateFiscalDocumentFinancialStatus).toHaveBeenCalledWith(
        fiscalDocumentId,
        'NO_TITLE',
        organizationId
      );
    });

    it('deve rejeitar reversão de títulos já pagos', async () => {
      const mockDocument: FiscalDocumentData = {
        id: BigInt(3),
        organizationId: BigInt(10),
        branchId: BigInt(1),
        partnerId: BigInt(100),
        partnerName: 'Fornecedor Teste',
        documentNumber: '12345',
        documentType: 'NFE',
        issueDate: new Date('2024-01-01'),
        netAmount: 1000.00,
        fiscalClassification: 'PURCHASE',
        financialStatus: 'GENERATED',
      };

      mockRepository.getFiscalDocumentById.mockResolvedValue(Result.ok(mockDocument));
      mockRepository.hasPaidTitles.mockResolvedValue(Result.ok(true));

      const result = await generator.reverseTitles({
        fiscalDocumentId: BigInt(3),
        organizationId: BigInt(10),
      });

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('pagos ou recebidos');
    });
  });
});

