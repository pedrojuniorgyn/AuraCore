import { describe, it, expect } from 'vitest';
import { calculateTaxScenario } from '../../src/tools/calculate-tax-scenario.js';

describe('calculateTaxScenario', () => {
  describe('validação de entrada', () => {
    it('deve rejeitar operation_type inválido', async () => {
      await expect(
        calculateTaxScenario({
          operation_type: 'invalid' as 'venda',
          origin_uf: 'SP',
          dest_uf: 'RJ',
          value: 1000,
          is_simples_nacional: false,
        })
      ).rejects.toThrow('operation_type inválido');
    });

    it('deve rejeitar UF de origem inválida', async () => {
      await expect(
        calculateTaxScenario({
          operation_type: 'venda',
          origin_uf: 'XX',
          dest_uf: 'RJ',
          value: 1000,
          is_simples_nacional: false,
        })
      ).rejects.toThrow('origin_uf inválido');
    });

    it('deve rejeitar UF de destino inválida', async () => {
      await expect(
        calculateTaxScenario({
          operation_type: 'venda',
          origin_uf: 'SP',
          dest_uf: 'XX',
          value: 1000,
          is_simples_nacional: false,
        })
      ).rejects.toThrow('dest_uf inválido');
    });

    it('deve rejeitar valor zero', async () => {
      await expect(
        calculateTaxScenario({
          operation_type: 'venda',
          origin_uf: 'SP',
          dest_uf: 'RJ',
          value: 0,
          is_simples_nacional: false,
        })
      ).rejects.toThrow('value deve ser maior que zero');
    });

    it('deve rejeitar valor negativo', async () => {
      await expect(
        calculateTaxScenario({
          operation_type: 'venda',
          origin_uf: 'SP',
          dest_uf: 'RJ',
          value: -100,
          is_simples_nacional: false,
        })
      ).rejects.toThrow('value deve ser maior que zero');
    });

    it('deve rejeitar NCM com formato inválido', async () => {
      await expect(
        calculateTaxScenario({
          operation_type: 'venda',
          origin_uf: 'SP',
          dest_uf: 'RJ',
          value: 1000,
          is_simples_nacional: false,
          product_ncm: '1234', // Deve ter 8 dígitos
        })
      ).rejects.toThrow('product_ncm deve ter 8 dígitos');
    });

    it('deve aceitar NCM com formato válido', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'RJ',
        value: 1000,
        is_simples_nacional: false,
        product_ncm: '84719012',
      });

      expect(result).toBeDefined();
      expect(result.taxes.icms).toBeDefined();
    });
  });

  describe('cálculo ICMS - operação interna', () => {
    it('deve calcular ICMS para operação interna em SP', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'SP',
        value: 1000,
        is_simples_nacional: false,
      });

      // ICMS interno SP = 18%
      expect(result.taxes.icms.aliquota).toBe(18);
      expect(result.taxes.icms.valor).toBe(180);
      expect(result.taxes.icms.cst).toBe('00');
    });

    it('deve calcular ICMS para operação interna em RJ', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'RJ',
        dest_uf: 'RJ',
        value: 1000,
        is_simples_nacional: false,
      });

      // ICMS interno RJ = 22%
      expect(result.taxes.icms.aliquota).toBe(22);
      expect(result.taxes.icms.valor).toBe(220);
    });
  });

  describe('cálculo ICMS - operação interestadual', () => {
    it('deve aplicar alíquota 7% de SP para BA', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'BA',
        value: 1000,
        is_simples_nacional: false,
      });

      // SP -> BA = 7% (Sul/Sudeste para Norte/Nordeste/CO)
      expect(result.taxes.icms.aliquota).toBe(7);
      expect(result.taxes.icms.valor).toBe(70);
    });

    it('deve aplicar alíquota 12% de BA para SP', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'BA',
        dest_uf: 'SP',
        value: 1000,
        is_simples_nacional: false,
      });

      // BA -> SP = 12% (padrão interestadual)
      expect(result.taxes.icms.aliquota).toBe(12);
      expect(result.taxes.icms.valor).toBe(120);
    });

    it('deve mencionar DIFAL quando aplicável', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'RJ',
        value: 1000,
        is_simples_nacional: false,
      });

      // Deve ter observação sobre DIFAL (RJ tem 22%, interestadual é 12%)
      expect(result.observacoes.some(o => o.includes('DIFAL'))).toBe(true);
    });
  });

  describe('Simples Nacional', () => {
    it('deve zerar ICMS para Simples Nacional', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'RJ',
        value: 1000,
        is_simples_nacional: true,
      });

      expect(result.taxes.icms.aliquota).toBe(0);
      expect(result.taxes.icms.valor).toBe(0);
      expect(result.taxes.icms.cst).toBe('102'); // CSOSN
    });

    it('deve zerar PIS/COFINS para Simples Nacional', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'RJ',
        value: 1000,
        is_simples_nacional: true,
      });

      expect(result.taxes.pis.aliquota).toBe(0);
      expect(result.taxes.pis.valor).toBe(0);
      expect(result.taxes.cofins.aliquota).toBe(0);
      expect(result.taxes.cofins.valor).toBe(0);
    });

    it('deve incluir observação sobre DAS', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'RJ',
        value: 1000,
        is_simples_nacional: true,
      });

      expect(result.observacoes.some(o => o.includes('DAS'))).toBe(true);
    });
  });

  describe('PIS/COFINS regime não-cumulativo', () => {
    it('deve calcular PIS 1.65% e COFINS 7.6%', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'SP',
        value: 1000,
        is_simples_nacional: false,
      });

      expect(result.taxes.pis.aliquota).toBe(1.65);
      expect(result.taxes.pis.valor).toBe(16.5);
      expect(result.taxes.cofins.aliquota).toBe(7.6);
      expect(result.taxes.cofins.valor).toBe(76);
    });
  });

  describe('operação de serviço (ISS)', () => {
    it('deve calcular ISS ao invés de ICMS', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'servico',
        origin_uf: 'SP',
        dest_uf: 'SP',
        value: 1000,
        is_simples_nacional: false,
        service_code: '01.01',
      });

      // ICMS zerado para serviço
      expect(result.taxes.icms.aliquota).toBe(0);
      expect(result.taxes.icms.cst).toBe('41');

      // ISS calculado
      expect(result.taxes.iss).toBeDefined();
      expect(result.taxes.iss?.aliquota).toBe(5);
      expect(result.taxes.iss?.valor).toBe(50);
    });

    it('deve incluir observação sobre variação de ISS por município', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'servico',
        origin_uf: 'SP',
        dest_uf: 'SP',
        value: 1000,
        is_simples_nacional: false,
      });

      expect(result.observacoes.some(o => o.includes('município'))).toBe(true);
    });
  });

  describe('CFOP e natureza de operação', () => {
    it('deve retornar CFOP interno para operação intraestadual - venda', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'SP',
        value: 1000,
        is_simples_nacional: false,
      });

      expect(result.cfop_sugerido).toBe('5102');
      expect(result.natureza_operacao).toContain('Venda');
    });

    it('deve retornar CFOP interestadual para operação entre estados - venda', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'RJ',
        value: 1000,
        is_simples_nacional: false,
      });

      expect(result.cfop_sugerido).toBe('6102');
    });

    it('deve retornar CFOP correto para compra', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'compra',
        origin_uf: 'SP',
        dest_uf: 'SP',
        value: 1000,
        is_simples_nacional: false,
      });

      expect(result.cfop_sugerido).toBe('1102');
      expect(result.natureza_operacao).toContain('Compra');
    });

    it('deve retornar CFOP correto para transferência', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'transferencia',
        origin_uf: 'SP',
        dest_uf: 'RJ',
        value: 1000,
        is_simples_nacional: false,
      });

      expect(result.cfop_sugerido).toBe('6152');
      expect(result.natureza_operacao).toContain('Transferência');
    });

    it('deve retornar CFOP correto para devolução', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'devolucao',
        origin_uf: 'SP',
        dest_uf: 'SP',
        value: 1000,
        is_simples_nacional: false,
      });

      expect(result.cfop_sugerido).toBe('5202');
      expect(result.natureza_operacao).toContain('Devolução');
    });
  });

  describe('preview Reforma 2026', () => {
    it('deve incluir preview quando solicitado', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'RJ',
        value: 1000,
        is_simples_nacional: false,
        include_2026_preview: true,
      });

      expect(result.reforma_2026_preview).toBeDefined();
      expect(result.reforma_2026_preview?.ibs).toBeGreaterThan(0);
      expect(result.reforma_2026_preview?.cbs).toBeGreaterThan(0);
      expect(result.reforma_2026_preview?.total).toBe(
        result.reforma_2026_preview!.ibs + result.reforma_2026_preview!.cbs
      );
    });

    it('não deve incluir preview quando não solicitado', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'RJ',
        value: 1000,
        is_simples_nacional: false,
        include_2026_preview: false,
      });

      expect(result.reforma_2026_preview).toBeUndefined();
    });

    it('deve incluir observações sobre transição', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'RJ',
        value: 1000,
        is_simples_nacional: false,
        include_2026_preview: true,
      });

      expect(result.observacoes.some(o => o.includes('2026'))).toBe(true);
      expect(result.observacoes.some(o => o.includes('2032'))).toBe(true);
    });
  });

  describe('arredondamento', () => {
    it('deve arredondar valores para 2 casas decimais', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'SP',
        dest_uf: 'SP',
        value: 999.99,
        is_simples_nacional: false,
      });

      // Verificar que valores estão com 2 casas decimais
      const icmsValorStr = result.taxes.icms.valor.toString();
      const decimalPart = icmsValorStr.split('.')[1];
      expect(decimalPart === undefined || decimalPart.length <= 2).toBe(true);
    });
  });

  describe('UFs case insensitive', () => {
    it('deve aceitar UF em minúsculas', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'sp',
        dest_uf: 'rj',
        value: 1000,
        is_simples_nacional: false,
      });

      expect(result).toBeDefined();
      expect(result.taxes.icms).toBeDefined();
    });

    it('deve aceitar UF em maiúsculas/minúsculas mistas', async () => {
      const result = await calculateTaxScenario({
        operation_type: 'venda',
        origin_uf: 'Sp',
        dest_uf: 'Rj',
        value: 1000,
        is_simples_nacional: false,
      });

      expect(result).toBeDefined();
    });
  });
});
