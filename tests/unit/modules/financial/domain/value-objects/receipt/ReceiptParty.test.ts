import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { ReceiptParty, DocumentType } from '@/modules/financial/domain/value-objects/receipt/ReceiptParty';

describe('ReceiptParty', () => {
  it('should create party with valid CPF', () => {
    const result = ReceiptParty.create({
      nome: 'João da Silva',
      documento: '123.456.789-01',
      tipoDocumento: 'CPF',
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.nome).toBe('João da Silva');
      expect(result.value.documento).toBe('12345678901');
    }
  });

  it('should create party with valid CNPJ', () => {
    const result = ReceiptParty.create({
      nome: 'Empresa XYZ Ltda',
      documento: '12.345.678/0001-90',
      tipoDocumento: 'CNPJ',
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.nome).toBe('Empresa XYZ Ltda');
      expect(result.value.documento).toBe('12345678000190');
    }
  });

  it('should fail if CPF does not have 11 digits', () => {
    const result = ReceiptParty.create({
      nome: 'João da Silva',
      documento: '123456789',
      tipoDocumento: 'CPF',
    });

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('CPF must have 11 digits');
    }
  });

  it('should fail if CNPJ does not have 14 digits', () => {
    const result = ReceiptParty.create({
      nome: 'Empresa XYZ',
      documento: '12345678000',
      tipoDocumento: 'CNPJ',
    });

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('CNPJ must have 14 digits');
    }
  });

  it('should fail if nome is empty', () => {
    const result = ReceiptParty.create({
      nome: '',
      documento: '12345678901',
      tipoDocumento: 'CPF',
    });

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Nome is required');
    }
  });

  it('should fail if nome is too short', () => {
    const result = ReceiptParty.create({
      nome: 'AB',
      documento: '12345678901',
      tipoDocumento: 'CPF',
    });

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('must be at least 3 characters');
    }
  });

  it('should format CPF correctly', () => {
    const party = ReceiptParty.create({
      nome: 'João da Silva',
      documento: '12345678901',
      tipoDocumento: 'CPF',
    }).value;

    expect(party.formatDocumento()).toBe('123.456.789-01');
  });

  it('should format CNPJ correctly', () => {
    const party = ReceiptParty.create({
      nome: 'Empresa XYZ Ltda',
      documento: '12345678000190',
      tipoDocumento: 'CNPJ',
    }).value;

    expect(party.formatDocumento()).toBe('12.345.678/0001-90');
  });

  it('should create party with endereco', () => {
    const result = ReceiptParty.create({
      nome: 'João da Silva',
      documento: '12345678901',
      tipoDocumento: 'CPF',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        complemento: 'Apto 45',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234567',
      },
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.endereco).toBeDefined();
      expect(result.value.endereco?.logradouro).toBe('Rua das Flores');
    }
  });

  it('should format endereco correctly', () => {
    const party = ReceiptParty.create({
      nome: 'João da Silva',
      documento: '12345678901',
      tipoDocumento: 'CPF',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        complemento: 'Apto 45',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234567',
      },
    }).value;

    const formatted = party.formatEndereco();
    expect(formatted).toContain('Rua das Flores, 123');
    expect(formatted).toContain('Apto 45');
    expect(formatted).toContain('São Paulo/SP');
  });

  it('should compare parties by documento', () => {
    const party1 = ReceiptParty.create({
      nome: 'João da Silva',
      documento: '12345678901',
      tipoDocumento: 'CPF',
    }).value;

    const party2 = ReceiptParty.create({
      nome: 'João Silva',
      documento: '12345678901',
      tipoDocumento: 'CPF',
    }).value;

    expect(party1.equals(party2)).toBe(true);
  });

  it('should validate tipoDocumento during reconstitution', () => {
    const result = ReceiptParty.reconstitute({
      nome: 'João da Silva',
      documento: '12345678901',
      tipoDocumento: 'INVALID_TYPE' as DocumentType, // Intentionally invalid
    });

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Invalid tipo documento: INVALID_TYPE');
    }
  });
});

