/**
 * @description Testes para ConsultSPEDTool
 */

import { describe, it, expect } from 'vitest';
import { ConsultSPEDTool } from '@/agent/tools/fiscal/ConsultSPEDTool';
import type { AgentExecutionContext } from '@/agent/core/AgentContext';

describe('ConsultSPEDTool', () => {
  const tool = new ConsultSPEDTool();

  const mockContext: AgentExecutionContext = {
    userId: 'user-123',
    organizationId: 1,
    branchId: 1,
    sessionId: 'session-123',
  };

  describe('metadata', () => {
    it('deve ter nome correto', () => {
      expect(tool.name).toBe('consult_sped');
    });

    it('deve ter categoria fiscal', () => {
      expect(tool.category).toBe('fiscal');
    });

    it('deve ter descrição', () => {
      expect(tool.description).toContain('SPED');
    });
  });

  describe('execute', () => {
    it('deve retornar resumo do SPED Fiscal', async () => {
      const result = await tool.execute(
        {
          tipo: 'fiscal',
          periodo: {
            inicio: '2026-01',
            fim: '2026-03',
          },
        },
        mockContext
      );

      expect(result.isSuccess).toBe(true);
      const data = result.value;
      
      expect(data.success).toBe(true);
      expect(data.tipo).toContain('ICMS/IPI');
      expect(data.periodo).toEqual({ inicio: '2026-01', fim: '2026-03' });
      expect(data.registros).toBeGreaterThan(0);
      expect(data.resumo.total_entradas).toBeGreaterThan(0);
      expect(data.resumo.total_saidas).toBeGreaterThan(0);
      expect(data.resumo.icms_debito).toBeGreaterThan(0);
      expect(data.resumo.icms_credito).toBeGreaterThan(0);
    });

    it('deve retornar resumo do SPED Contribuições', async () => {
      const result = await tool.execute(
        {
          tipo: 'contribuicoes',
          periodo: {
            inicio: '2026-01',
            fim: '2026-01',
          },
        },
        mockContext
      );

      expect(result.isSuccess).toBe(true);
      const data = result.value;
      
      expect(data.tipo).toContain('Contribuições');
      expect(data.resumo.pis_debito).toBeGreaterThan(0);
      expect(data.resumo.cofins_debito).toBeGreaterThan(0);
      // ICMS não é calculado no SPED Contribuições
      expect(data.resumo.icms_debito).toBe(0);
    });

    it('deve retornar resumo do ECD', async () => {
      const result = await tool.execute(
        {
          tipo: 'ecd',
          periodo: {
            inicio: '2026-01',
            fim: '2026-12',
          },
        },
        mockContext
      );

      expect(result.isSuccess).toBe(true);
      const data = result.value;
      
      expect(data.tipo).toContain('Contábil');
      expect(data.resumo.total_entradas).toBeGreaterThan(0);
    });

    it('deve filtrar por participante (CNPJ)', async () => {
      const result = await tool.execute(
        {
          tipo: 'fiscal',
          periodo: {
            inicio: '2026-01',
            fim: '2026-03',
          },
          filtros: {
            participante: '12345678000199',
          },
        },
        mockContext
      );

      expect(result.isSuccess).toBe(true);
      const data = result.value;
      
      // Com filtro, valores são menores
      expect(data.resumo.total_entradas).toBeLessThan(500000);
      // Verificar que há sugestão sobre filtro de participante
      expect(data.sugestoes.some(sug => sug.includes('CNPJ') || sug.includes('participante'))).toBe(true);
    });

    it('deve alertar período superior a 12 meses', async () => {
      const result = await tool.execute(
        {
          tipo: 'fiscal',
          periodo: {
            inicio: '2025-01',
            fim: '2026-03',
          },
        },
        mockContext
      );

      expect(result.isSuccess).toBe(true);
      // Verificar alerta sobre período longo
      expect(result.value.alertas.some(alerta => 
        alerta.includes('12') || alerta.includes('meses')
      )).toBe(true);
    });

    it('deve falhar se período inicial maior que final', async () => {
      const result = await tool.execute(
        {
          tipo: 'fiscal',
          periodo: {
            inicio: '2026-06',
            fim: '2026-01',
          },
        },
        mockContext
      );

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Período inicial');
    });
  });

  describe('call (validação de input)', () => {
    it('deve rejeitar tipo inválido', async () => {
      const result = await tool.call(
        {
          tipo: 'invalido',
          periodo: { inicio: '2026-01', fim: '2026-03' },
        },
        mockContext
      );

      expect(result.success).toBe(false);
    });

    it('deve rejeitar formato de período inválido', async () => {
      const result = await tool.call(
        {
          tipo: 'fiscal',
          periodo: { inicio: '01/2026', fim: '03/2026' },
        },
        mockContext
      );

      expect(result.success).toBe(false);
    });

    it('deve aceitar filtros opcionais', async () => {
      const result = await tool.call(
        {
          tipo: 'fiscal',
          periodo: { inicio: '2026-01', fim: '2026-01' },
          filtros: {
            cfop: ['5102', '6102'],
            ncm: ['12345678'],
          },
        },
        mockContext
      );

      expect(result.success).toBe(true);
    });
  });
});
