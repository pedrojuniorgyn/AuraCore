'use client';

/**
 * WithholdingTaxBreakdown - Detalhamento de Retenções na Fonte
 * 
 * Exibe IRRF, PIS, COFINS, CSLL, ISS e INSS com alíquotas e valores.
 * Referência: LC 116/03, Lei 10.833/03
 */
import { useMemo } from 'react';
import { 
  Receipt, TrendingDown, Info, AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface WithholdingTax {
  type: 'IRRF' | 'PIS' | 'COFINS' | 'CSLL' | 'ISS' | 'INSS';
  rate: number;
  baseAmount: number;
  taxAmount: number;
  legalBasis: string;
  isRetained: boolean;
}

interface WithholdingTaxBreakdownProps {
  grossAmount: number;
  taxes: WithholdingTax[];
  currency?: string;
  showLegalBasis?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TAX_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  IRRF: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  PIS: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  COFINS: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  CSLL: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  ISS: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  INSS: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
};

const TAX_DESCRIPTIONS: Record<string, string> = {
  IRRF: 'Imposto de Renda Retido na Fonte',
  PIS: 'PIS/PASEP Retido',
  COFINS: 'COFINS Retido',
  CSLL: 'CSLL Retida',
  ISS: 'ISS Retido',
  INSS: 'INSS Retido (11%)',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function WithholdingTaxBreakdown({
  grossAmount,
  taxes,
  currency = 'BRL',
  showLegalBasis = false,
}: WithholdingTaxBreakdownProps) {
  const totalRetained = useMemo(
    () => taxes.filter(t => t.isRetained).reduce((sum, t) => sum + t.taxAmount, 0),
    [taxes]
  );

  const netAmount = grossAmount - totalRetained;
  const retentionRate = grossAmount > 0 ? (totalRetained / grossAmount) * 100 : 0;

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">Retenções na Fonte</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
          {retentionRate.toFixed(1)}% retido
        </span>
      </div>

      {/* Gross Amount */}
      <div className="bg-gray-800/50 rounded-lg p-3 border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Valor Bruto</span>
          <span className="text-sm font-mono font-semibold text-white">
            {formatCurrency(grossAmount)}
          </span>
        </div>
      </div>

      {/* Tax Lines */}
      <div className="space-y-2">
        {taxes.map((tax) => {
          const colors = TAX_COLORS[tax.type] || TAX_COLORS.IRRF;
          return (
            <div
              key={tax.type}
              className={cn(
                'rounded-lg p-3 border transition-all',
                colors.bg, colors.border,
                !tax.isRetained && 'opacity-50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className={cn('h-3.5 w-3.5', colors.text)} />
                  <div>
                    <span className={cn('text-sm font-medium', colors.text)}>
                      {tax.type}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({tax.rate.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-semibold text-white">
                    - {formatCurrency(tax.taxAmount)}
                  </span>
                  {!tax.isRetained && (
                    <span className="block text-[10px] text-gray-500">Não retido</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-1.5 text-xs text-gray-500">
                <span>{TAX_DESCRIPTIONS[tax.type]}</span>
                <span>Base: {formatCurrency(tax.baseAmount)}</span>
              </div>

              {showLegalBasis && (
                <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-600">
                  <Info className="h-3 w-3" />
                  {tax.legalBasis}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="space-y-2 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Total Retido</span>
          <span className="text-sm font-mono font-semibold text-red-400">
            - {formatCurrency(totalRetained)}
          </span>
        </div>
        <div className="flex items-center justify-between bg-green-500/10 rounded-lg p-3 border border-green-500/20">
          <span className="text-sm font-medium text-green-400">Valor Líquido</span>
          <span className="text-lg font-mono font-bold text-green-300">
            {formatCurrency(netAmount)}
          </span>
        </div>
      </div>

      {/* Warning if minimum not reached */}
      {totalRetained === 0 && taxes.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Valor abaixo do mínimo para retenção (R$ 10,00 por tributo).</span>
        </div>
      )}
    </div>
  );
}
