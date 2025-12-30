import { describe, it, expect } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { NFSeMapper } from '@/modules/fiscal/infrastructure/nfse/persistence/NFSeMapper';
import { 
  NFSeDocument,
  NFSeProvider,
  NFSeTaker,
  NFSeAddress,
  NFSeService,
  NFSeIss
} from '@/modules/fiscal/domain/nfse/entities/NFSeDocument';
import { DocumentStatus } from '@/modules/fiscal/domain/value-objects/DocumentType';

describe('NFSeMapper', () => {
  const createValidAddress = (): NFSeAddress => ({
    logradouro: 'Rua Teste',
    numero: '123',
    bairro: 'Centro',
    codigoMunicipio: '3550308',
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

  describe('roundtrip (domain → persistence → domain)', () => {
    it('should preserve all fields in roundtrip', () => {
      const valorLiquidoResult = Money.create(950, 'BRL');
      const createResult = NFSeDocument.create({
        id: 'nfse-123',
        organizationId: 1,
        branchId: 1,
        numero: '1',
        serie: 'A',
        dataEmissao: new Date(2025, 0, 15),
        competencia: new Date(2025, 0, 1),
        prestador: createValidPrestador(),
        tomador: createValidTomador(),
        servico: createValidServico(),
        iss: createValidIss(),
        valorLiquido: valorLiquidoResult.value,
        observacoes: 'Teste de observações',
      });

      const original = (createResult as { value: NFSeDocument }).value;
      const persistence = NFSeMapper.toPersistence(original);
      const reconstructedResult = NFSeMapper.toDomain(persistence);

      expect(Result.isOk(reconstructedResult)).toBe(true);
      const reconstructed = (reconstructedResult as { value: NFSeDocument }).value;

      expect(reconstructed.id).toBe(original.id);
      expect(reconstructed.numero).toBe(original.numero);
      expect(reconstructed.serie).toBe(original.serie);
      expect(reconstructed.prestador.cnpj).toBe(original.prestador.cnpj);
      expect(reconstructed.tomador.cpfCnpj).toBe(original.tomador.cpfCnpj);
      expect(reconstructed.valorLiquido.amount).toBe(original.valorLiquido.amount);
      expect(reconstructed.valorLiquido.currency).toBe(original.valorLiquido.currency);
      expect(reconstructed.observacoes).toBe(original.observacoes);
    });

    it('should preserve currency in Money fields', () => {
      const valorLiquidoResult = Money.create(950, 'USD');
      const valorServicosResult = Money.create(1000, 'USD');
      const valorIssResult = Money.create(50, 'USD');
      const baseCalculoResult = Money.create(1000, 'USD');

      const servico: NFSeService = {
        codigoServico: '01.01',
        codigoCnae: '6201500',
        discriminacao: 'Software development services',
        valorServicos: valorServicosResult.value,
      };

      const iss: NFSeIss = {
        issRetido: false,
        valorIss: valorIssResult.value,
        aliquota: 5.0,
        baseCalculo: baseCalculoResult.value,
      };

      const createResult = NFSeDocument.create({
        id: 'nfse-123',
        organizationId: 1,
        branchId: 1,
        numero: '1',
        dataEmissao: new Date(2025, 0, 15),
        competencia: new Date(2025, 0, 1),
        prestador: createValidPrestador(),
        tomador: createValidTomador(),
        servico,
        iss,
        valorLiquido: valorLiquidoResult.value,
      });

      const original = (createResult as { value: NFSeDocument }).value;
      const persistence = NFSeMapper.toPersistence(original);
      const reconstructedResult = NFSeMapper.toDomain(persistence);

      expect(Result.isOk(reconstructedResult)).toBe(true);
      const reconstructed = (reconstructedResult as { value: NFSeDocument }).value;

      expect(reconstructed.valorLiquido.currency).toBe('USD');
      expect(reconstructed.servico.valorServicos.currency).toBe('USD');
      expect(reconstructed.iss.valorIss.currency).toBe('USD');
      expect(reconstructed.iss.baseCalculo.currency).toBe('USD');
    });

    it('should handle optional fields correctly', () => {
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

      const original = (createResult as { value: NFSeDocument }).value;
      const persistence = NFSeMapper.toPersistence(original);
      const reconstructedResult = NFSeMapper.toDomain(persistence);

      expect(Result.isOk(reconstructedResult)).toBe(true);
      const reconstructed = (reconstructedResult as { value: NFSeDocument }).value;

      expect(reconstructed.serie).toBeUndefined();
      expect(reconstructed.observacoes).toBeUndefined();
      expect(reconstructed.numeroNfse).toBeUndefined();
    });
  });
});

