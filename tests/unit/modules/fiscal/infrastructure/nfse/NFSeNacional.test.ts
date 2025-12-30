import { describe, it, expect } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { NFSeNacional } from '@/modules/fiscal/infrastructure/nfse/adapters/NFSeNacional';
import { Environment } from '@/modules/fiscal/domain/nfse/ports/INFSeAdapter';
import { 
  NFSeDocument,
  NFSeProvider,
  NFSeTaker,
  NFSeAddress,
  NFSeService,
  NFSeIss
} from '@/modules/fiscal/domain/nfse/entities/NFSeDocument';

describe('NFSeNacional (ABRASF 2.04)', () => {
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

  describe('toXml', () => {
    it('should convert NFSeDocument to XML', () => {
      const adapter = new NFSeNacional();
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
      const xmlResult = adapter.toXml(nfse);

      expect(Result.isOk(xmlResult)).toBe(true);
      const xml = (xmlResult as { value: string }).value;
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<GerarNfseEnvio');
    });
  });

  describe('getServiceUrl', () => {
    it('should return production URL', () => {
      const adapter = new NFSeNacional();
      const url = adapter.getServiceUrl(Environment.PRODUCTION);
      expect(url).toContain('producao');
    });

    it('should return homologation URL', () => {
      const adapter = new NFSeNacional();
      const url = adapter.getServiceUrl(Environment.HOMOLOGATION);
      expect(url).toContain('homologacao');
    });
  });

  describe('getStandardName', () => {
    it('should return ABRASF', () => {
      const adapter = new NFSeNacional();
      expect(adapter.getStandardName()).toBe('ABRASF');
    });
  });

  describe('getStandardVersion', () => {
    it('should return 2.04', () => {
      const adapter = new NFSeNacional();
      expect(adapter.getStandardVersion()).toBe('2.04');
    });
  });
});

