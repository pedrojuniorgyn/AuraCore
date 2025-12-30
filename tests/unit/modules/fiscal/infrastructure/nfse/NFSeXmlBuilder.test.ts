import { describe, it, expect } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { NFSeXmlBuilder } from '@/modules/fiscal/infrastructure/nfse/xml/NFSeXmlBuilder';
import { 
  NFSeDocument,
  NFSeProvider,
  NFSeTaker,
  NFSeAddress,
  NFSeService,
  NFSeIss
} from '@/modules/fiscal/domain/nfse/entities/NFSeDocument';

describe('NFSeXmlBuilder', () => {
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

  describe('buildRps', () => {
    it('should generate valid XML for RPS', () => {
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
      const xml = NFSeXmlBuilder.buildRps(nfse);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<GerarNfseEnvio');
      expect(xml).toContain('<Numero>1</Numero>');
      expect(xml).toContain('<Cnpj>12345678000195</Cnpj>');
      expect(xml).toContain('<ValorServicos>1000.00</ValorServicos>');
      expect(xml).toContain('<IssRetido>2</IssRetido>'); // 2 = Não retido
      expect(xml).toContain('</GerarNfseEnvio>');
    });

    it('should escape special XML characters', () => {
      const valorLiquidoResult = Money.create(950, 'BRL');
      const valorServicosResult = Money.create(1000, 'BRL');
      
      const servico: NFSeService = {
        codigoServico: '01.01',
        codigoCnae: '6201500',
        discriminacao: 'Serviço com <caracteres> & "especiais"',
        valorServicos: valorServicosResult.value,
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
        iss: createValidIss(),
        valorLiquido: valorLiquidoResult.value,
      });

      const nfse = (createResult as { value: NFSeDocument }).value;
      const xml = NFSeXmlBuilder.buildRps(nfse);

      expect(xml).toContain('&lt;caracteres&gt;');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&quot;');
    });

    it('should format CPF correctly for tomador', () => {
      const valorLiquidoResult = Money.create(950, 'BRL');
      const tomador: NFSeTaker = {
        cpfCnpj: '12345678901', // 11 dígitos = CPF
        razaoSocial: 'Cliente Teste',
      };

      const createResult = NFSeDocument.create({
        id: 'nfse-123',
        organizationId: 1,
        branchId: 1,
        numero: '1',
        dataEmissao: new Date(2025, 0, 15),
        competencia: new Date(2025, 0, 1),
        prestador: createValidPrestador(),
        tomador,
        servico: createValidServico(),
        iss: createValidIss(),
        valorLiquido: valorLiquidoResult.value,
      });

      const nfse = (createResult as { value: NFSeDocument }).value;
      const xml = NFSeXmlBuilder.buildRps(nfse);

      expect(xml).toContain('<Cpf>12345678901</Cpf>');
      expect(xml).not.toContain('<Cnpj>12345678901</Cnpj>');
    });
  });

  describe('buildCancelamento', () => {
    it('should generate valid XML for cancellation', () => {
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

      const xml = NFSeXmlBuilder.buildCancelamento(nfse, 'Cancelamento por erro no valor do serviço');

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<CancelarNfseEnvio');
      expect(xml).toContain('<Numero>123456</Numero>');
      expect(xml).toContain('<MotivoCancelamento>');
      expect(xml).toContain('</CancelarNfseEnvio>');
    });

    it('should throw error if NFS-e is not authorized', () => {
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

      expect(() => {
        NFSeXmlBuilder.buildCancelamento(nfse, 'Motivo do cancelamento');
      }).toThrow();
    });
  });

  describe('validate', () => {
    it('should validate valid NFS-e', () => {
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
      const validation = NFSeXmlBuilder.validate(nfse);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation with empty discriminacao', () => {
      const valorLiquidoResult = Money.create(950, 'BRL');
      const valorServicosResult = Money.create(1000, 'BRL');
      
      const servico: NFSeService = {
        codigoServico: '01.01',
        codigoCnae: '6201500',
        discriminacao: 'A', // Discriminação muito curta (mínimo 3 caracteres)
        valorServicos: valorServicosResult.value,
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
        iss: createValidIss(),
        valorLiquido: valorLiquidoResult.value,
      });

      if (Result.isOk(createResult)) {
        const nfse = (createResult as { value: NFSeDocument }).value;
        const validation = NFSeXmlBuilder.validate(nfse);

        expect(validation.valid).toBe(false);
        expect(validation.errors.some(e => e.includes('Discriminação') || e.includes('discriminação'))).toBe(true);
      } else {
        // Se falhar na criação, é porque a validação já pegou a discriminação inválida
        expect(Result.isFail(createResult)).toBe(true);
      }
    });
  });
});

