/**
 * @description Tool para calcular impostos de operações fiscais
 * 
 * Integra com os serviços de cálculo existentes do AuraCore:
 * - src/services/fiscal/tax-calculator.ts (matriz tributária ICMS)
 * - Suporte a ICMS, PIS, COFINS, ISS
 * 
 * @see docs/agent/TOOLS_SPEC.md#CalculateTaxTool
 */

import { z } from 'zod';
import { BaseTool } from '../base/BaseTool';
import type { AgentExecutionContext } from '../../core/AgentContext';
import { Result } from '@/shared/domain';

/**
 * Schema de input
 */
const CalculateTaxInputSchema = z.object({
  operacao: z.enum(['venda', 'compra', 'transferencia', 'devolucao', 'servico'])
    .describe('Tipo de operação fiscal'),
  uf_origem: z.string().length(2).describe('UF de origem (ex: SP, RJ, MG)'),
  uf_destino: z.string().length(2).describe('UF de destino (ex: SP, RJ, MG)'),
  valor: z.number().positive().describe('Valor da operação em reais'),
  ncm: z.string().optional().describe('NCM do produto (8 dígitos)'),
  codigo_servico: z.string().optional().describe('Código do serviço conforme LC 116/03'),
  regime_tributario: z.enum(['lucro_real', 'lucro_presumido', 'simples'])
    .describe('Regime tributário da empresa'),
});

type CalculateTaxInput = z.infer<typeof CalculateTaxInputSchema>;

/**
 * Imposto calculado
 */
interface TaxDetail {
  base: number;
  aliquota: number;
  valor: number;
}

/**
 * Resultado do cálculo de impostos
 */
interface CalculateTaxOutput {
  success: boolean;
  impostos: {
    icms: TaxDetail;
    pis: TaxDetail;
    cofins: TaxDetail;
    ipi?: TaxDetail;
    iss?: TaxDetail;
  };
  cfop: string;
  natureza_operacao: string;
  total_impostos: number;
  valor_liquido: number;
  observacoes: string[];
}

/**
 * Alíquotas padrão por regime (simplificado para MVP)
 * Em produção, buscar da matriz tributária
 */
const ALIQUOTAS_PADRAO = {
  lucro_real: {
    pis: 1.65,
    cofins: 7.6,
  },
  lucro_presumido: {
    pis: 0.65,
    cofins: 3.0,
  },
  simples: {
    pis: 0,
    cofins: 0,
  },
};

/**
 * ICMS interestadual (tabela simplificada)
 */
const ICMS_INTERESTADUAL: Record<string, Record<string, number>> = {
  // Origem: { Destino: Alíquota }
  SP: { SP: 18, RJ: 12, MG: 12, PR: 12, SC: 12, RS: 12, DEFAULT: 7 },
  RJ: { RJ: 20, SP: 12, MG: 12, DEFAULT: 7 },
  MG: { MG: 18, SP: 12, RJ: 12, DEFAULT: 7 },
  PR: { PR: 18, SP: 12, SC: 12, RS: 12, DEFAULT: 7 },
  SC: { SC: 17, SP: 12, PR: 12, RS: 12, DEFAULT: 7 },
  RS: { RS: 18, SP: 12, PR: 12, SC: 12, DEFAULT: 7 },
  DEFAULT: { DEFAULT: 12 },
};

/**
 * CFOP por tipo de operação
 */
const CFOP_MAP: Record<string, { intra: string; inter: string }> = {
  venda: { intra: '5102', inter: '6102' },
  compra: { intra: '1102', inter: '2102' },
  transferencia: { intra: '5152', inter: '6152' },
  devolucao: { intra: '5202', inter: '6202' },
  servico: { intra: '5933', inter: '6933' },
};

/**
 * Natureza da operação por tipo
 */
const NATUREZA_OPERACAO: Record<string, string> = {
  venda: 'Venda de mercadoria',
  compra: 'Compra para comercialização',
  transferencia: 'Transferência de mercadoria',
  devolucao: 'Devolução de mercadoria',
  servico: 'Prestação de serviço',
};

/**
 * Tool para calcular impostos
 * 
 * @example
 * ```
 * Usuário: "Quanto de imposto pago numa venda de R$ 10.000 de SP para RJ?"
 * Agente usa: CalculateTaxTool({ 
 *   operacao: 'venda', 
 *   uf_origem: 'SP', 
 *   uf_destino: 'RJ', 
 *   valor: 10000,
 *   regime_tributario: 'lucro_real'
 * })
 * ```
 */
export class CalculateTaxTool extends BaseTool<CalculateTaxInput, CalculateTaxOutput> {
  readonly name = 'calculate_tax';
  readonly description = `Calcula impostos para operações fiscais brasileiras (ICMS, PIS, COFINS, ISS).
Use quando o usuário quiser:
- Saber quanto de imposto paga em uma operação
- Simular tributação entre estados
- Comparar regimes tributários
- Verificar CFOP correto para operação

Parâmetros:
- operacao: 'venda', 'compra', 'transferencia', 'devolucao', 'servico'
- uf_origem: UF de origem (2 letras)
- uf_destino: UF de destino (2 letras)
- valor: Valor da operação em R$
- regime_tributario: 'lucro_real', 'lucro_presumido', 'simples'
- ncm: NCM do produto (opcional)
- codigo_servico: Código LC 116/03 (opcional, para serviços)`;

  readonly category = 'fiscal' as const;
  readonly schema = CalculateTaxInputSchema;

  async execute(
    input: CalculateTaxInput,
    context: AgentExecutionContext
  ): Promise<Result<CalculateTaxOutput, string>> {
    try {
      const { operacao, uf_origem, uf_destino, valor, regime_tributario, codigo_servico } = input;
      const observacoes: string[] = [];

      // Determinar se é operação intraestadual
      const isIntraestadual = uf_origem.toUpperCase() === uf_destino.toUpperCase();

      // Calcular ICMS
      const icmsAliquota = this.getIcmsAliquota(uf_origem, uf_destino);
      const icmsBase = valor;
      const icmsValor = (icmsBase * icmsAliquota) / 100;

      // Calcular PIS/COFINS
      const aliquotas = ALIQUOTAS_PADRAO[regime_tributario];
      const pisBase = valor;
      const pisValor = (pisBase * aliquotas.pis) / 100;
      const cofinsBase = valor;
      const cofinsValor = (cofinsBase * aliquotas.cofins) / 100;

      // ISS para serviços
      let issDetail: TaxDetail | undefined;
      if (operacao === 'servico' && codigo_servico) {
        const issAliquota = 5.0; // Alíquota padrão, pode variar por município
        issDetail = {
          base: valor,
          aliquota: issAliquota,
          valor: (valor * issAliquota) / 100,
        };
        observacoes.push(`ISS calculado com alíquota padrão de ${issAliquota}%. Verificar alíquota do município.`);
      }

      // Determinar CFOP
      const cfopInfo = CFOP_MAP[operacao] || CFOP_MAP.venda;
      const cfop = isIntraestadual ? cfopInfo.intra : cfopInfo.inter;

      // Total de impostos
      const totalImpostos = icmsValor + pisValor + cofinsValor + (issDetail?.valor || 0);
      const valorLiquido = valor - totalImpostos;

      // Observações adicionais
      if (regime_tributario === 'simples') {
        observacoes.push('Empresa optante pelo Simples Nacional. PIS/COFINS já inclusos no DAS.');
        observacoes.push('ICMS pode ter redução conforme anexo do Simples.');
      }

      if (!isIntraestadual) {
        observacoes.push(`Operação interestadual ${uf_origem} → ${uf_destino}. Verificar DIFAL se consumidor final.`);
      }

      if (input.ncm) {
        observacoes.push(`NCM ${input.ncm} informado. Verificar benefícios fiscais aplicáveis.`);
      }

      return Result.ok({
        success: true,
        impostos: {
          icms: {
            base: icmsBase,
            aliquota: icmsAliquota,
            valor: icmsValor,
          },
          pis: {
            base: pisBase,
            aliquota: aliquotas.pis,
            valor: pisValor,
          },
          cofins: {
            base: cofinsBase,
            aliquota: aliquotas.cofins,
            valor: cofinsValor,
          },
          iss: issDetail,
        },
        cfop,
        natureza_operacao: NATUREZA_OPERACAO[operacao] || 'Operação fiscal',
        total_impostos: Math.round(totalImpostos * 100) / 100,
        valor_liquido: Math.round(valorLiquido * 100) / 100,
        observacoes,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao calcular impostos: ${errorMessage}`);
    }
  }

  /**
   * Obtém alíquota de ICMS entre estados
   */
  private getIcmsAliquota(origem: string, destino: string): number {
    const ufOrigem = origem.toUpperCase();
    const ufDestino = destino.toUpperCase();

    const origemMap = ICMS_INTERESTADUAL[ufOrigem] || ICMS_INTERESTADUAL.DEFAULT;
    return origemMap[ufDestino] ?? origemMap.DEFAULT ?? 12;
  }
}
