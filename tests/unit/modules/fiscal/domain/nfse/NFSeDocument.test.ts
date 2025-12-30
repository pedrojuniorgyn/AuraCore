import { describe, it, expect } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { 
  NFSeDocument,
  NFSeProvider,
  NFSeTaker,
  NFSeAddress,
  NFSeService,
  NFSeIss
} from '@/modules/fiscal/domain/nfse/entities/NFSeDocument';
import { DocumentStatus } from '@/modules/fiscal/domain/value-objects/DocumentType';

describe('NFSeDocument', () => {
  const createValidAddress = (): NFSeAddress => ({
    logradouro: 'Rua Teste',
    numero: '123',
    bairro: 'Centro',
    codigoMunicipio: '3550308', // São Paulo
    uf: 'SP',
    cep: '01310100',
  });

  const createValidPrestador = (): NFSeProvider => ({
    cnpj: '12345678000195',
    razaoSocial: 'Empresa Teste LTDA',
    inscricaoMunicipal: '123456',
    endereco: createValidAddress(),
  });

  const createValidTomador = (): NFSeTaker => ({
    cpfCnpj: '12345678901',
    razaoSocial: 'Cliente Teste',
  });

  const createValidServico = (): NFSeService => {
    const valorServicosResult = Money.create(1000, 'BRL');
    return {
      codigoServico: '01.01',
      codigoCnae: '6201500',
      discriminacao: 'Serviços de desenvolvimento de software',
      valorServicos: valorServicosResult.value,
    };
  };

  const createValidIss = (): NFSeIss => {
    const valorIssResult = Money.create(50, 'BRL');
    const baseCalculoResult = Money.create(1000, 'BRL');
    return {
      issRetido: false,
      valorIss: valorIssResult.value,
      aliquota: 5.0,
      baseCalculo: baseCalculoResult.value,
    };
  };

  describe('create', () => {
    it('should create a valid NFSeDocument in DRAFT status', () => {
      const valorLiquidoResult = Money.create(950, 'BRL');
      
      const result = NFSeDocument.create({
        id: 'nfse-123',
        organizationId: 1,
        branchId: 1,
        numero: '1',
        dataEmissao: new Date(2025, 0, 15),
        competencia: new Date(2025, 0, 1),
        prestador: createValidPrestador(),
        tomador: createValidTomador(),
        servico: createValidServico(),
        iss: createValidIss(),
        valorLiquido: valorLiquidoResult.value,
      });

      expect(Result.isOk(result)).toBe(true);
      const nfse = (result as { value: NFSeDocument }).value;
      expect(nfse.status).toBe('DRAFT');
      expect(nfse.numero).toBe('1');
      expect(nfse.isDraft).toBe(true);
    });

    it('should fail if numero is empty', () => {
      const valorLiquidoResult = Money.create(950, 'BRL');
      
      const result = NFSeDocument.create({
        id: 'nfse-123',
        organizationId: 1,
        branchId: 1,
        numero: '',
        dataEmissao: new Date(2025, 0, 15),
        competencia: new Date(2025, 0, 1),
        prestador: createValidPrestador(),
        tomador: createValidTomador(),
        servico: createValidServico(),
        iss: createValidIss(),
        valorLiquido: valorLiquidoResult.value,
      });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail if valorLiquido is zero or negative', () => {
      const valorLiquidoResult = Money.create(0, 'BRL');
      
      const result = NFSeDocument.create({
        id: 'nfse-123',
        organizationId: 1,
        branchId: 1,
        numero: '1',
        dataEmissao: new Date(2025, 0, 15),
        competencia: new Date(2025, 0, 1),
        prestador: createValidPrestador(),
        tomador: createValidTomador(),
        servico: createValidServico(),
        iss: createValidIss(),
        valorLiquido: valorLiquidoResult.value,
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('submit', () => {
    it('should submit DRAFT document to PENDING', () => {
      const valorLiquidoResult = Money.create(950, 'BRL');
      const createResult = NFSeDocument.create({
        id: 'nfse-123',
        organizationId: 1,
        branchId: 1,
        numero: '1',
        dataEmissao: new Date(2025, 0, 15),
        competencia: new Date(2025, 0, 1),
        prestador: createValidPrestador(),
        tomador: createValidTomador(),
        servico: createValidServico(),
        iss: createValidIss(),
        valorLiquido: valorLiquidoResult.value,
      });

      const nfse = (createResult as { value: NFSeDocument }).value;
      const submitResult = nfse.submit();

      expect(Result.isOk(submitResult)).toBe(true);
      expect(nfse.status).toBe('PENDING');
      expect(nfse.isPending).toBe(true);
      expect(nfse.domainEvents).toHaveLength(1);
    });

    it('should fail to submit if already authorized', () => {
      const valorLiquidoResult = Money.create(950, 'BRL');
      const createResult = NFSeDocument.create({
        id: 'nfse-123',
        organizationId: 1,
        branchId: 1,
        numero: '1',
        dataEmissao: new Date(2025, 0, 15),
        competencia: new Date(2025, 0, 1),
        prestador: createValidPrestador(),
        tomador: createValidTomador(),
        servico: createValidServico(),
        iss: createValidIss(),
        valorLiquido: valorLiquidoResult.value,
      });

      const nfse = (createResult as { value: NFSeDocument }).value;
      nfse.submit();
      nfse.authorize('123456', 'ABC123DEF', 'PROT-001');

      const submitResult = nfse.submit();
      expect(Result.isFail(submitResult)).toBe(true);
    });
  });

  describe('authorize', () => {
    it('should authorize PENDING document', () => {
      const valorLiquidoResult = Money.create(950, 'BRL');
      const createResult = NFSeDocument.create({
        id: 'nfse-123',
        organizationId: 1,
        branchId: 1,
        numero: '1',
        dataEmissao: new Date(2025, 0, 15),
        competencia: new Date(2025, 0, 1),
        prestador: createValidPrestador(),
        tomador: createValidTomador(),
        servico: createValidServico(),
        iss: createValidIss(),
        valorLiquido: valorLiquidoResult.value,
      });

      const nfse = (createResult as { value: NFSeDocument }).value;
      nfse.submit();
      const authorizeResult = nfse.authorize('123456', 'ABC123DEF', 'PROT-001');

      expect(Result.isOk(authorizeResult)).toBe(true);
      expect(nfse.status).toBe('AUTHORIZED');
      expect(nfse.isAuthorized).toBe(true);
      expect(nfse.numeroNfse).toBe('123456');
      expect(nfse.codigoVerificacao).toBe('ABC123DEF');
    });

    it('should fail to authorize if not PENDING', () => {
      const valorLiquidoResult = Money.create(950, 'BRL');
      const createResult = NFSeDocument.create({
        id: 'nfse-123',
        organizationId: 1,
        branchId: 1,
        numero: '1',
        dataEmissao: new Date(2025, 0, 15),
        competencia: new Date(2025, 0, 1),
        prestador: createValidPrestador(),
        tomador: createValidTomador(),
        servico: createValidServico(),
        iss: createValidIss(),
        valorLiquido: valorLiquidoResult.value,
      });

      const nfse = (createResult as { value: NFSeDocument }).value;
      const authorizeResult = nfse.authorize('123456', 'ABC123DEF', 'PROT-001');

      expect(Result.isFail(authorizeResult)).toBe(true);
    });
  });

  describe('cancel', () => {
    it('should cancel AUTHORIZED document', () => {
      const valorLiquidoResult = Money.create(950, 'BRL');
      const createResult = NFSeDocument.create({
        id: 'nfse-123',
        organizationId: 1,
        branchId: 1,
        numero: '1',
        dataEmissao: new Date(2025, 0, 15),
        competencia: new Date(2025, 0, 1),
        prestador: createValidPrestador(),
        tomador: createValidTomador(),
        servico: createValidServico(),
        iss: createValidIss(),
        valorLiquido: valorLiquidoResult.value,
      });

      const nfse = (createResult as { value: NFSeDocument }).value;
      nfse.submit();
      nfse.authorize('123456', 'ABC123DEF', 'PROT-001');
      
      const cancelResult = nfse.cancel('Cancelamento solicitado pelo cliente por erro no valor');

      expect(Result.isOk(cancelResult)).toBe(true);
      expect(nfse.status).toBe('CANCELLED');
      expect(nfse.isCancelled).toBe(true);
      expect(nfse.motivoCancelamento).toBe('Cancelamento solicitado pelo cliente por erro no valor');
    });

    it('should fail to cancel with short reason', () => {
      const valorLiquidoResult = Money.create(950, 'BRL');
      const createResult = NFSeDocument.create({
        id: 'nfse-123',
        organizationId: 1,
        branchId: 1,
        numero: '1',
        dataEmissao: new Date(2025, 0, 15),
        competencia: new Date(2025, 0, 1),
        prestador: createValidPrestador(),
        tomador: createValidTomador(),
        servico: createValidServico(),
        iss: createValidIss(),
        valorLiquido: valorLiquidoResult.value,
      });

      const nfse = (createResult as { value: NFSeDocument }).value;
      nfse.submit();
      nfse.authorize('123456', 'ABC123DEF', 'PROT-001');
      
      const cancelResult = nfse.cancel('Erro');

      expect(Result.isFail(cancelResult)).toBe(true);
    });
  });
});

