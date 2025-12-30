import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import { Receipt } from '@/modules/financial/domain/entities/receipt/Receipt';
import { ReceiptParty } from '@/modules/financial/domain/value-objects/receipt/ReceiptParty';
import { ReceiptMapper } from '@/modules/financial/infrastructure/persistence/receipt/ReceiptMapper';

describe('ReceiptMapper', () => {
  const validPagador = ReceiptParty.create({
    nome: 'João da Silva',
    documento: '12345678901',
    tipoDocumento: 'CPF',
  }).value;

  const validRecebedor = ReceiptParty.create({
    nome: 'Transportadora XYZ Ltda',
    documento: '12345678000190',
    tipoDocumento: 'CNPJ',
    endereco: {
      logradouro: 'Rua Teste',
      numero: '100',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234567',
    },
  }).value;

  const validValor = Money.create(1500.50, 'BRL').value;

  it('should map domain to persistence correctly', () => {
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

    const persistence = ReceiptMapper.toPersistence(receipt);

    expect(persistence.id).toBe('receipt-1');
    expect(persistence.organizationId).toBe(1);
    expect(persistence.branchId).toBe(1);
    expect(persistence.tipo).toBe('FRETE');
    expect(persistence.numero).toBe(123);
    expect(persistence.serie).toBe('A');
    expect(persistence.pagadorNome).toBe('João da Silva');
    expect(persistence.recebedorNome).toBe('Transportadora XYZ Ltda');
    expect(persistence.valorAmount).toBe('1500.50');
    expect(persistence.valorCurrency).toBe('BRL');
  });

  it('should preserve Money with 2 fields (amount + currency)', () => {
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

    const persistence = ReceiptMapper.toPersistence(receipt);

    // Verificar que ambos os campos estão presentes
    expect(persistence.valorAmount).toBeDefined();
    expect(persistence.valorCurrency).toBeDefined();
    expect(persistence.valorCurrency).toBe('BRL');
  });

  it('should map persistence to domain correctly (reconstitute)', () => {
    const persistence = {
      id: 'receipt-1',
      organizationId: 1,
      branchId: 1,
      tipo: 'FRETE',
      numero: 123,
      serie: 'A',
      pagadorNome: 'João da Silva',
      pagadorDocumento: '12345678901',
      pagadorTipoDocumento: 'CPF',
      pagadorEnderecoLogradouro: null,
      pagadorEnderecoNumero: null,
      pagadorEnderecoComplemento: null,
      pagadorEnderecoBairro: null,
      pagadorEnderecoCidade: null,
      pagadorEnderecoEstado: null,
      pagadorEnderecoCep: null,
      recebedorNome: 'Transportadora XYZ Ltda',
      recebedorDocumento: '12345678000190',
      recebedorTipoDocumento: 'CNPJ',
      recebedorEnderecoLogradouro: 'Rua Teste',
      recebedorEnderecoNumero: '100',
      recebedorEnderecoComplemento: null,
      recebedorEnderecoBairro: 'Centro',
      recebedorEnderecoCidade: 'São Paulo',
      recebedorEnderecoEstado: 'SP',
      recebedorEnderecoCep: '01234567',
      valorAmount: '1500.50',
      valorCurrency: 'BRL',
      valorPorExtenso: 'um mil, quinhentos reais e cinquenta centavos',
      descricao: 'Pagamento de frete referente à viagem 12345',
      formaPagamento: 'PIX',
      dataRecebimento: new Date('2024-01-15'),
      localRecebimento: null,
      financialTransactionId: null,
      payableId: null,
      receivableId: null,
      tripId: null,
      expenseReportId: null,
      emitidoPor: 'user-1',
      emitidoEm: new Date('2024-01-15T10:00:00Z'),
      status: 'ACTIVE',
      canceladoEm: null,
      canceladoPor: null,
      motivoCancelamento: null,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      createdBy: 'user-1',
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      updatedBy: 'user-1',
      deletedAt: null,
    };

    const result = ReceiptMapper.toDomain(persistence);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.id).toBe('receipt-1');
      expect(result.value.numero).toBe(123);
      expect(result.value.valor.amount).toBe(1500.50);
      expect(result.value.valor.currency).toBe('BRL');
    }
  });

  it('should handle optional endereco correctly', () => {
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

    const persistence = ReceiptMapper.toPersistence(receipt);

    // Pagador sem endereço
    expect(persistence.pagadorEnderecoLogradouro).toBeNull();

    // Recebedor com endereço
    expect(persistence.recebedorEnderecoLogradouro).toBe('Rua Teste');
    expect(persistence.recebedorEnderecoCidade).toBe('São Paulo');
  });

  it('should roundtrip correctly (domain → persistence → domain)', () => {
    const original = Receipt.create({
      id: 'receipt-1',
      organizationId: 1,
      branchId: 1,
      tipo: 'ADIANTAMENTO',
      numero: 456,
      serie: 'B',
      pagador: validPagador,
      recebedor: validRecebedor,
      valor: validValor,
      descricao: 'Adiantamento para viagem longa com várias paradas',
      formaPagamento: 'TRANSFERENCIA',
      localRecebimento: 'São Paulo - SP',
      tripId: 'trip-123',
      emitidoPor: 'user-1',
      createdBy: 'user-1',
    }).value;

    const persistence = ReceiptMapper.toPersistence(original);
    const reconstructedResult = ReceiptMapper.toDomain(persistence);

    expect(Result.isOk(reconstructedResult)).toBe(true);
    if (Result.isOk(reconstructedResult)) {
      const reconstructed = reconstructedResult.value;

      expect(reconstructed.id).toBe(original.id);
      expect(reconstructed.numero).toBe(original.numero);
      expect(reconstructed.serie).toBe(original.serie);
      expect(reconstructed.tipo).toBe(original.tipo);
      expect(reconstructed.valor.amount).toBe(original.valor.amount);
      expect(reconstructed.valor.currency).toBe(original.valor.currency);
      expect(reconstructed.descricao).toBe(original.descricao);
      expect(reconstructed.formaPagamento).toBe(original.formaPagamento);
      expect(reconstructed.localRecebimento).toBe(original.localRecebimento);
      expect(reconstructed.tripId).toBe(original.tripId);
    }
  });

  it('should handle cancelled receipt correctly', () => {
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

    receipt.cancel('Pagamento duplicado, corrigir', 'user-2');

    const persistence = ReceiptMapper.toPersistence(receipt);

    expect(persistence.status).toBe('CANCELLED');
    expect(persistence.motivoCancelamento).toBe('Pagamento duplicado, corrigir');
    expect(persistence.canceladoPor).toBe('user-2');
    expect(persistence.canceladoEm).toBeDefined();
  });
});

