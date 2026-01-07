import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import { Receipt } from '@/modules/financial/domain/entities/receipt/Receipt';
import { ReceiptParty } from '@/modules/financial/domain/value-objects/receipt/ReceiptParty';

describe('Receipt', () => {
  const validPagador = ReceiptParty.create({
    nome: 'João da Silva',
    documento: '12345678901',
    tipoDocumento: 'CPF',
  }).value;

  const validRecebedor = ReceiptParty.create({
    nome: 'Transportadora XYZ Ltda',
    documento: '12345678000190',
    tipoDocumento: 'CNPJ',
  }).value;

  const validValor = Money.create(1500.50, 'BRL').value;

  it('should create receipt with valid props', () => {
    const result = Receipt.create({
      id: 'receipt-1',
      organizationId: 1,
      branchId: 1,
      tipo: 'FRETE',
      numero: 1,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      descricao: 'Pagamento de frete referente à viagem 12345',
      formaPagamento: 'PIX',
      emitidoPor: 'user-1',
      createdBy: 'user-1',
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.id).toBe('receipt-1');
      expect(result.value.numero).toBe(1);
      expect(result.value.serie).toBe('A');
      expect(result.value.status).toBe('ACTIVE');
    }
  });

  it('should generate valor por extenso automatically', () => {
    const result = Receipt.create({
      id: 'receipt-1',
      organizationId: 1,
      branchId: 1,
      tipo: 'FRETE',
      numero: 1,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      descricao: 'Pagamento de frete referente à viagem 12345',
      formaPagamento: 'PIX',
      emitidoPor: 'user-1',
      createdBy: 'user-1',
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.valorPorExtenso).toContain('mil');
      expect(result.value.valorPorExtenso).toContain('reais');
    }
  });

  it('should fail if id is empty', () => {
    const result = Receipt.create({
      id: '',
      organizationId: 1,
      branchId: 1,
      tipo: 'FRETE',
      numero: 1,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      descricao: 'Pagamento de frete referente à viagem 12345',
      formaPagamento: 'PIX',
      emitidoPor: 'user-1',
      createdBy: 'user-1',
    });

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('id is required');
    }
  });

  it('should fail if organizationId is invalid', () => {
    const result = Receipt.create({
      id: 'receipt-1',
      organizationId: 0,
      branchId: 1,
      tipo: 'FRETE',
      numero: 1,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      descricao: 'Pagamento de frete referente à viagem 12345',
      formaPagamento: 'PIX',
      emitidoPor: 'user-1',
      createdBy: 'user-1',
    });

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Organization id is required');
    }
  });

  it('should fail if branchId is invalid', () => {
    const result = Receipt.create({
      id: 'receipt-1',
      organizationId: 1,
      branchId: -1,
      tipo: 'FRETE',
      numero: 1,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      descricao: 'Pagamento de frete referente à viagem 12345',
      formaPagamento: 'PIX',
      emitidoPor: 'user-1',
      createdBy: 'user-1',
    });

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Branch id is required');
    }
  });

  it('should fail if valor is not positive', () => {
    const zeroValor = Money.create(0, 'BRL').value;

    const result = Receipt.create({
      id: 'receipt-1',
      organizationId: 1,
      branchId: 1,
      tipo: 'FRETE',
      numero: 1,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: zeroValor,
      descricao: 'Pagamento de frete referente à viagem 12345',
      formaPagamento: 'PIX',
      emitidoPor: 'user-1',
      createdBy: 'user-1',
    });

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Valor must be positive');
    }
  });

  it('should fail if descricao is too short', () => {
    const result = Receipt.create({
      id: 'receipt-1',
      organizationId: 1,
      branchId: 1,
      tipo: 'FRETE',
      numero: 1,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      descricao: 'Curto',
      formaPagamento: 'PIX',
      emitidoPor: 'user-1',
      createdBy: 'user-1',
    });

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('must be at least 10 characters');
    }
  });

  it('should cancel receipt with valid motivation', () => {
    const receipt = Receipt.create({
      id: 'receipt-1',
      organizationId: 1,
      branchId: 1,
      tipo: 'FRETE',
      numero: 1,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      descricao: 'Pagamento de frete referente à viagem 12345',
      formaPagamento: 'PIX',
      emitidoPor: 'user-1',
      createdBy: 'user-1',
    }).value;

    const result = receipt.cancel(
      'Pagamento duplicado, corrigir',
      'user-2'
    );

    expect(Result.isOk(result)).toBe(true);
    expect(receipt.status).toBe('CANCELLED');
    expect(receipt.motivoCancelamento).toBe('Pagamento duplicado, corrigir');
    expect(receipt.canceladoPor).toBe('user-2');
  });

  it('should fail to cancel if motivation is too short', () => {
    const receipt = Receipt.create({
      id: 'receipt-1',
      organizationId: 1,
      branchId: 1,
      tipo: 'FRETE',
      numero: 1,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      descricao: 'Pagamento de frete referente à viagem 12345',
      formaPagamento: 'PIX',
      emitidoPor: 'user-1',
      createdBy: 'user-1',
    }).value;

    const result = receipt.cancel('Curto', 'user-2');

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('must be at least 10 characters');
    }
  });

  it('should fail to cancel if already cancelled', () => {
    const receipt = Receipt.create({
      id: 'receipt-1',
      organizationId: 1,
      branchId: 1,
      tipo: 'FRETE',
      numero: 1,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      descricao: 'Pagamento de frete referente à viagem 12345',
      formaPagamento: 'PIX',
      emitidoPor: 'user-1',
      createdBy: 'user-1',
    }).value;

    receipt.cancel('Motivo inicial de cancelamento', 'user-2');
    const result = receipt.cancel('Tentando cancelar novamente', 'user-2');

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('already cancelled');
    }
  });

  it('should format numero completo correctly', () => {
    const receipt = Receipt.create({
      id: 'receipt-1',
      organizationId: 1,
      branchId: 1,
      tipo: 'FRETE',
      numero: 123,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      descricao: 'Pagamento de frete referente à viagem 12345',
      formaPagamento: 'PIX',
      emitidoPor: 'user-1',
      createdBy: 'user-1',
    }).value;

    expect(receipt.getNumeroCompleto()).toBe('A-000123');
  });

  it('should validate status during reconstitution', () => {
    const result = Receipt.reconstitute({
      id: 'receipt-1',
      organizationId: 1,
      branchId: 1,
      tipo: 'FRETE',
      numero: 1,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      valorPorExtenso: 'um mil reais',
      descricao: 'Pagamento de frete',
      formaPagamento: 'PIX',
      dataRecebimento: new Date(),
      emitidoPor: 'user-1',
      emitidoEm: new Date(),
      status: 'INVALID_STATUS' as unknown,
      createdAt: new Date(),
      createdBy: 'user-1',
      updatedAt: new Date(),
      updatedBy: 'user-1',
    });

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Invalid receipt status');
    }
  });

  it('should validate tipo during reconstitution', () => {
    const result = Receipt.reconstitute({
      id: 'receipt-1',
      organizationId: 1,
      branchId: 1,
      tipo: 'INVALID_TYPE' as unknown,
      numero: 1,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      valorPorExtenso: 'um mil reais',
      descricao: 'Pagamento de frete',
      formaPagamento: 'PIX',
      dataRecebimento: new Date(),
      emitidoPor: 'user-1',
      emitidoEm: new Date(),
      status: 'ACTIVE',
      createdAt: new Date(),
      createdBy: 'user-1',
      updatedAt: new Date(),
      updatedBy: 'user-1',
    });

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Invalid receipt type: INVALID_TYPE');
    }
  });

  it('should validate formaPagamento during reconstitution', () => {
    const result = Receipt.reconstitute({
      id: 'receipt-1',
      organizationId: 1,
      branchId: 1,
      tipo: 'FRETE',
      numero: 1,
      serie: 'A',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      valorPorExtenso: 'um mil reais',
      descricao: 'Pagamento de frete',
      formaPagamento: 'INVALID_PAYMENT' as unknown,
      dataRecebimento: new Date(),
      emitidoPor: 'user-1',
      emitidoEm: new Date(),
      status: 'ACTIVE',
      createdAt: new Date(),
      createdBy: 'user-1',
      updatedAt: new Date(),
      updatedBy: 'user-1',
    });

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Invalid forma pagamento: INVALID_PAYMENT');
    }
  });
});

