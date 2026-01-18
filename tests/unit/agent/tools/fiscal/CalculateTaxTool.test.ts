/**
 * @description Testes para CalculateTaxTool
 */

import { describe, it, expect } from 'vitest';
import { CalculateTaxTool } from '@/agent/tools/fiscal/CalculateTaxTool';
import type { AgentExecutionContext } from '@/agent/core/AgentContext';

describe('CalculateTaxTool', () => {
  const tool = new CalculateTaxTool();

  const mockContext: AgentExecutionContext = {
    userId: 'user-123',
    organizationId: 1,
    branchId: 1,
    sessionId: 'session-123',
  };

  describe('metadata', () => {
    it('deve ter nome correto', () => {
      expect(tool.name).toBe('calculate_tax');
    });

    it('deve ter categoria fiscal', () => {
      expect(tool.category).toBe('fiscal');
    });

    it('deve ter descrição', () => {
      expect(tool.description).toContain('impostos');
    });
  });

  describe('execute', () => {
    it('deve calcular impostos para venda intraestadual SP-SP', async () => {
      const result = await tool.execute(
        {
          operacao: 'venda',
          uf_origem: 'SP',
          uf_destino: 'SP',
          valor: 10000,
          regime_tributario: 'lucro_real',
        },
        mockContext
      );

      expect(result.isSuccess).toBe(true);
      const data = result.value;
      
      expect(data.success).toBe(true);
      expect(data.cfop).toBe('5102'); // CFOP intraestadual
      expect(data.impostos.icms.aliquota).toBe(18); // ICMS SP interno
      expect(data.impostos.icms.valor).toBe(1800); // 18% de 10000
      expect(data.impostos.pis.aliquota).toBe(1.65); // Lucro Real
      expect(data.impostos.cofins.aliquota).toBe(7.6); // Lucro Real
    });

    it('deve calcular impostos para venda interestadual SP-RJ', async () => {
      const result = await tool.execute(
        {
          operacao: 'venda',
          uf_origem: 'SP',
          uf_destino: 'RJ',
          valor: 10000,
          regime_tributario: 'lucro_real',
        },
        mockContext
      );

      expect(result.isSuccess).toBe(true);
      const data = result.value;
      
      expect(data.cfop).toBe('6102'); // CFOP interestadual
      expect(data.impostos.icms.aliquota).toBe(12); // ICMS interestadual SP-RJ
      expect(data.impostos.icms.valor).toBe(1200);
    });

    it('deve usar alíquotas corretas para Lucro Presumido', async () => {
      const result = await tool.execute(
        {
          operacao: 'venda',
          uf_origem: 'SP',
          uf_destino: 'SP',
          valor: 10000,
          regime_tributario: 'lucro_presumido',
        },
        mockContext
      );

      expect(result.isSuccess).toBe(true);
      const data = result.value;
      
      expect(data.impostos.pis.aliquota).toBe(0.65); // PIS cumulativo
      expect(data.impostos.cofins.aliquota).toBe(3.0); // COFINS cumulativo
    });

    it('deve zerar PIS/COFINS para Simples Nacional', async () => {
      const result = await tool.execute(
        {
          operacao: 'venda',
          uf_origem: 'SP',
          uf_destino: 'SP',
          valor: 10000,
          regime_tributario: 'simples',
        },
        mockContext
      );

      expect(result.isSuccess).toBe(true);
      const data = result.value;
      
      expect(data.impostos.pis.aliquota).toBe(0);
      expect(data.impostos.cofins.aliquota).toBe(0);
      // Verificar que há observação sobre Simples
      expect(data.observacoes.some(obs => obs.includes('Simples'))).toBe(true);
    });

    it('deve calcular ISS para serviços', async () => {
      const result = await tool.execute(
        {
          operacao: 'servico',
          uf_origem: 'SP',
          uf_destino: 'SP',
          valor: 5000,
          codigo_servico: '17.01',
          regime_tributario: 'lucro_real',
        },
        mockContext
      );

      expect(result.isSuccess).toBe(true);
      const data = result.value;
      
      expect(data.impostos.iss).toBeDefined();
      expect(data.impostos.iss?.aliquota).toBe(5.0);
      expect(data.impostos.iss?.valor).toBe(250); // 5% de 5000
    });

    it('deve retornar natureza da operação correta', async () => {
      const operacoes = ['venda', 'compra', 'transferencia', 'devolucao'] as const;
      
      for (const operacao of operacoes) {
        const result = await tool.execute(
          {
            operacao,
            uf_origem: 'SP',
            uf_destino: 'SP',
            valor: 1000,
            regime_tributario: 'lucro_real',
          },
          mockContext
        );

        expect(result.isSuccess).toBe(true);
        expect(result.value.natureza_operacao).toBeTruthy();
      }
    });

    it('deve adicionar observação sobre DIFAL em operação interestadual', async () => {
      const result = await tool.execute(
        {
          operacao: 'venda',
          uf_origem: 'SP',
          uf_destino: 'BA',
          valor: 10000,
          regime_tributario: 'lucro_real',
        },
        mockContext
      );

      expect(result.isSuccess).toBe(true);
      // Verificar observação sobre operação interestadual
      expect(result.value.observacoes.some(obs => 
        obs.includes('interestadual') || obs.includes('DIFAL')
      )).toBe(true);
    });
  });

  describe('call (validação de input)', () => {
    it('deve rejeitar input inválido', async () => {
      const result = await tool.call(
        { operacao: 'invalida' }, // operacao inválida
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Input inválido');
    });

    it('deve rejeitar valor negativo', async () => {
      const result = await tool.call(
        {
          operacao: 'venda',
          uf_origem: 'SP',
          uf_destino: 'RJ',
          valor: -100,
          regime_tributario: 'lucro_real',
        },
        mockContext
      );

      expect(result.success).toBe(false);
    });

    it('deve rejeitar UF com tamanho incorreto', async () => {
      const result = await tool.call(
        {
          operacao: 'venda',
          uf_origem: 'SAO',
          uf_destino: 'RJ',
          valor: 1000,
          regime_tributario: 'lucro_real',
        },
        mockContext
      );

      expect(result.success).toBe(false);
    });
  });
});
