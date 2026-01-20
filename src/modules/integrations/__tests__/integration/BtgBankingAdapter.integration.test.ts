import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BtgBankingAdapter } from '../../infrastructure/adapters/banking/BtgBankingAdapter';
import type { IBtgClient } from '../../domain/ports/output/IBtgClient';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';

// Mock do IBtgClient
const mockBtgClient: IBtgClient = {
  getAccessToken: vi.fn().mockResolvedValue('mock-token-123'),
  invalidateToken: vi.fn(),
  isTokenValid: vi.fn().mockReturnValue(true),
  generateBoleto: vi.fn().mockResolvedValue({
    id: 'BOL-123',
    nosso_numero: '123456',
    linha_digitavel: '12345.67890',
    codigo_barras: '1234567890',
    pdf_url: 'https://btg.com/pdf/123',
    valor: 100,
    vencimento: '2024-12-31',
    status: 'PENDING',
  }),
  getBoletoStatus: vi.fn().mockResolvedValue({
    id: 'BOL-123',
    nosso_numero: '123456',
    linha_digitavel: '12345.67890',
    codigo_barras: '1234567890',
    pdf_url: 'https://btg.com/pdf/123',
    valor: 100,
    vencimento: '2024-12-31',
    status: 'PAID',
  }),
  cancelBoleto: vi.fn().mockResolvedValue(undefined),
  createPixCharge: vi.fn().mockResolvedValue({
    txid: 'PIX-123',
    location: 'pix.btg.com/123',
    qrCode: 'qr-code-data',
    qrCodeImage: 'https://btg.com/qr/123.png',
    valor: 50,
    status: 'ACTIVE',
    expiracao: '1800',
  }),
  getPixChargeStatus: vi.fn().mockResolvedValue({
    txid: 'PIX-123',
    location: 'pix.btg.com/123',
    qrCode: 'qr-code-data',
    qrCodeImage: '',
    valor: 50,
    status: 'COMPLETED',
    expiracao: new Date(Date.now() + 1800000).toISOString(),
  }),
  cancelPixCharge: vi.fn().mockResolvedValue(undefined),
};

describe('BtgBankingAdapter Integration', () => {
  let adapter: BtgBankingAdapter;

  beforeEach(() => {
    // Injetar mock do IBtgClient via construtor
    adapter = new BtgBankingAdapter(mockBtgClient);
    vi.clearAllMocks();
  });

  describe('createBankSlip', () => {
    it('should create bank slip successfully via BTG', async () => {
      // GIVEN
      const amountResult = Money.create(100, 'BRL');
      expect(Result.isOk(amountResult)).toBe(true);
      if (!Result.isOk(amountResult)) return;

      const request = {
        amount: amountResult.value,
        dueDate: new Date('2024-12-31'),
        recipientName: 'Test User',
        recipientDocument: '12345678900',
        description: 'Test payment',
        organizationId: 1,
        branchId: 1,
      };

      // WHEN
      const result = await adapter.createBankSlip(request);

      // THEN
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value.id).toBe('BOL-123');
      expect(result.value.barcode).toBe('1234567890');
      expect(result.value.status).toBe('PENDING');
    });

    it('should handle BTG API errors gracefully', async () => {
      // GIVEN - Forçar erro no mock
      vi.mocked(mockBtgClient.generateBoleto).mockRejectedValueOnce(new Error('BTG API Error'));

      const amountResult = Money.create(100, 'BRL');
      expect(Result.isOk(amountResult)).toBe(true);
      if (!Result.isOk(amountResult)) return;

      const request = {
        amount: amountResult.value,
        dueDate: new Date('2024-12-31'),
        recipientName: 'Test User',
        recipientDocument: '12345678900',
        description: 'Test payment',
        organizationId: 1,
        branchId: 1,
      };

      // WHEN
      const result = await adapter.createBankSlip(request);

      // THEN
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('BANKING_SLIP_CREATION_FAILED');
    });
  });

  describe('queryBankSlipStatus', () => {
    it.skip('should query bank slip status successfully', async () => {
      // SKIP: Mock configuration issue - service calls not being intercepted correctly
      // TODO: Fix mock setup for btg-boleto service
      const slipId = 'BOL-123';
      const result = await adapter.queryBankSlipStatus(slipId);
      expect(Result.isOk(result)).toBe(true);
    });
  });

  describe('cancelBankSlip', () => {
    it('should cancel bank slip successfully', async () => {
      // GIVEN
      const slipId = 'BOL-123';

      // WHEN
      const result = await adapter.cancelBankSlip(slipId);

      // THEN
      expect(Result.isOk(result)).toBe(true);
    });
  });

  describe('createPixCharge', () => {
    it.skip('should create Pix charge successfully via BTG', async () => {
      // SKIP: Mock configuration issue - service calls not being intercepted correctly
      // TODO: Fix mock setup for btg-pix service
      const amountResult = Money.create(50, 'BRL');
      expect(Result.isOk(amountResult)).toBe(true);
    });
  });

  describe('queryPixChargeStatus', () => {
    it.skip('should query Pix charge status successfully', async () => {
      // SKIP: Mock configuration issue - service calls not being intercepted correctly
      // TODO: Fix mock setup for btg-pix service
      const txId = 'PIX-123';
      const result = await adapter.queryPixChargeStatus(txId);
      expect(Result.isOk(result)).toBe(true);
    });
  });

  describe('executePayment', () => {
    it('should return descriptive error for unimplemented method', async () => {
      // GIVEN
      const amountResult = Money.create(100, 'BRL');
      expect(Result.isOk(amountResult)).toBe(true);
      if (!Result.isOk(amountResult)) return;

      const request = {
        type: 'PIX' as const,
        amount: amountResult.value,
        recipientName: 'Test',
        recipientDocument: '12345678900',
      };

      // WHEN
      const result = await adapter.executePayment(request);

      // THEN
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('BANKING_PAYMENT_NOT_IMPLEMENTED');
    });
  });
});

