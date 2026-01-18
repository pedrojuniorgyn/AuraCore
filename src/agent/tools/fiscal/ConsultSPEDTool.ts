/**
 * @description Tool para consultar registros SPED
 * 
 * Permite consultar dados do SPED Fiscal, SPED Contribuições e SPED ECD
 * para análise e auditoria fiscal.
 * 
 * @see docs/agent/TOOLS_SPEC.md#ConsultSPEDTool
 */

import { z } from 'zod';
import { BaseTool } from '../base/BaseTool';
import type { AgentExecutionContext } from '../../core/AgentContext';
import { Result } from '@/shared/domain';

/**
 * Schema de input
 */
const ConsultSPEDInputSchema = z.object({
  tipo: z.enum(['fiscal', 'contribuicoes', 'ecd'])
    .describe('Tipo de SPED: fiscal (EFD-ICMS/IPI), contribuicoes (EFD-Contribuições), ecd (Contábil)'),
  periodo: z.object({
    inicio: z.string().regex(/^\d{4}-\d{2}$/).describe('Período inicial (YYYY-MM)'),
    fim: z.string().regex(/^\d{4}-\d{2}$/).describe('Período final (YYYY-MM)'),
  }).describe('Período de consulta'),
  filtros: z.object({
    cfop: z.array(z.string()).optional().describe('Filtrar por CFOPs'),
    ncm: z.array(z.string()).optional().describe('Filtrar por NCMs'),
    participante: z.string().optional().describe('Filtrar por CNPJ do participante'),
  }).optional().describe('Filtros adicionais'),
});

type ConsultSPEDInput = z.infer<typeof ConsultSPEDInputSchema>;

/**
 * Resumo de registros SPED
 */
interface SPEDResumo {
  total_entradas: number;
  total_saidas: number;
  icms_debito: number;
  icms_credito: number;
  pis_debito: number;
  pis_credito: number;
  cofins_debito: number;
  cofins_credito: number;
}

/**
 * Resultado da consulta SPED
 */
interface ConsultSPEDOutput {
  success: boolean;
  tipo: string;
  periodo: {
    inicio: string;
    fim: string;
  };
  registros: number;
  resumo: SPEDResumo;
  alertas: string[];
  sugestoes: string[];
}

/**
 * Descrições dos tipos de SPED
 */
const SPED_TIPOS: Record<string, string> = {
  fiscal: 'EFD-ICMS/IPI (SPED Fiscal)',
  contribuicoes: 'EFD-Contribuições (PIS/COFINS)',
  ecd: 'ECD - Escrituração Contábil Digital',
};

/**
 * Tool para consultar SPED
 * 
 * @example
 * ```
 * Usuário: "Qual o resumo do SPED Fiscal de janeiro a março de 2026?"
 * Agente usa: ConsultSPEDTool({ 
 *   tipo: 'fiscal', 
 *   periodo: { inicio: '2026-01', fim: '2026-03' }
 * })
 * ```
 */
export class ConsultSPEDTool extends BaseTool<ConsultSPEDInput, ConsultSPEDOutput> {
  readonly name = 'consult_sped';
  readonly description = `Consulta registros SPED para análise e auditoria fiscal.
Use quando o usuário quiser:
- Ver resumo do SPED de um período
- Analisar entradas e saídas fiscais
- Verificar créditos de ICMS, PIS, COFINS
- Auditar operações por CFOP ou NCM
- Verificar operações com um participante (CNPJ)

Tipos de SPED:
- fiscal: EFD-ICMS/IPI (operações de mercadorias)
- contribuicoes: EFD-Contribuições (PIS/COFINS)
- ecd: Escrituração Contábil Digital

Parâmetros:
- tipo: 'fiscal', 'contribuicoes', 'ecd'
- periodo: { inicio: 'YYYY-MM', fim: 'YYYY-MM' }
- filtros (opcional): cfop[], ncm[], participante (CNPJ)`;

  readonly category = 'fiscal' as const;
  readonly schema = ConsultSPEDInputSchema;

  async execute(
    input: ConsultSPEDInput,
    context: AgentExecutionContext
  ): Promise<Result<ConsultSPEDOutput, string>> {
    try {
      const { tipo, periodo, filtros } = input;
      const alertas: string[] = [];
      const sugestoes: string[] = [];

      // Validar período
      const [anoInicio, mesInicio] = periodo.inicio.split('-').map(Number);
      const [anoFim, mesFim] = periodo.fim.split('-').map(Number);
      
      const dataInicio = new Date(anoInicio, mesInicio - 1, 1);
      const dataFim = new Date(anoFim, mesFim, 0); // Último dia do mês
      
      if (dataInicio > dataFim) {
        return Result.fail('Período inicial não pode ser maior que o final');
      }

      // Calcular número de meses
      const meses = (anoFim - anoInicio) * 12 + (mesFim - mesInicio) + 1;
      
      if (meses > 12) {
        alertas.push('Período superior a 12 meses. Considere consultar períodos menores para melhor performance.');
      }

      // TODO: Integrar com repositório real de SPED
      // Por enquanto, retornar dados simulados baseados no contexto
      const resumo = this.gerarResumoSimulado(tipo, meses, filtros);

      // Gerar alertas baseados nos dados
      if (resumo.icms_credito > resumo.icms_debito * 1.5) {
        alertas.push('Crédito de ICMS significativamente maior que débito. Verificar compras para revenda.');
      }

      if (resumo.total_saidas < resumo.total_entradas * 0.5) {
        alertas.push('Saídas muito menores que entradas. Verificar estoque ou operações não faturadas.');
      }

      // Sugestões
      if (tipo === 'fiscal') {
        sugestoes.push('Verifique se todas as notas de entrada com direito a crédito foram escrituradas.');
        sugestoes.push('Confira os CFOPs das operações interestaduais (alíquotas diferenciadas).');
      }

      if (tipo === 'contribuicoes') {
        sugestoes.push('Revise receitas com alíquota zero ou isentas para garantir classificação correta.');
      }

      if (filtros?.participante) {
        sugestoes.push(`Operações filtradas para CNPJ ${filtros.participante}. Verifique se há outras operações não capturadas.`);
      }

      // Contagem de registros (simulada)
      const registros = Math.floor(resumo.total_entradas / 1000) + Math.floor(resumo.total_saidas / 1000) + 50;

      return Result.ok({
        success: true,
        tipo: SPED_TIPOS[tipo] || tipo,
        periodo,
        registros,
        resumo,
        alertas,
        sugestoes,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao consultar SPED: ${errorMessage}`);
    }
  }

  /**
   * Gera resumo simulado para MVP
   * TODO: Substituir por consulta real ao banco de dados
   */
  private gerarResumoSimulado(
    tipo: string,
    meses: number,
    filtros?: { cfop?: string[]; ncm?: string[]; participante?: string }
  ): SPEDResumo {
    // Base mensal simulada
    const baseEntradas = 150000 * meses;
    const baseSaidas = 200000 * meses;

    // Aplicar variação se houver filtros
    const fatorFiltro = filtros?.participante ? 0.15 : 
                        (filtros?.cfop?.length || filtros?.ncm?.length) ? 0.3 : 1;

    const totalEntradas = baseEntradas * fatorFiltro;
    const totalSaidas = baseSaidas * fatorFiltro;

    // Calcular impostos baseados no tipo
    if (tipo === 'fiscal') {
      return {
        total_entradas: Math.round(totalEntradas),
        total_saidas: Math.round(totalSaidas),
        icms_debito: Math.round(totalSaidas * 0.18),
        icms_credito: Math.round(totalEntradas * 0.12),
        pis_debito: 0, // Não calculado no SPED Fiscal
        pis_credito: 0,
        cofins_debito: 0,
        cofins_credito: 0,
      };
    }

    if (tipo === 'contribuicoes') {
      return {
        total_entradas: Math.round(totalEntradas),
        total_saidas: Math.round(totalSaidas),
        icms_debito: 0, // Não calculado no SPED Contribuições
        icms_credito: 0,
        pis_debito: Math.round(totalSaidas * 0.0165),
        pis_credito: Math.round(totalEntradas * 0.0165),
        cofins_debito: Math.round(totalSaidas * 0.076),
        cofins_credito: Math.round(totalEntradas * 0.076),
      };
    }

    // ECD - resumo contábil
    return {
      total_entradas: Math.round(totalEntradas),
      total_saidas: Math.round(totalSaidas),
      icms_debito: 0,
      icms_credito: 0,
      pis_debito: 0,
      pis_credito: 0,
      cofins_debito: 0,
      cofins_credito: 0,
    };
  }
}
