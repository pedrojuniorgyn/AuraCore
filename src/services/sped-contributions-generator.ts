/**
 * 📄 SPED CONTRIBUIÇÕES GENERATOR (LEGACY - DEPRECATED)
 * Geração de arquivo EFD-Contribuições (PIS/COFINS)
 * 
 * @deprecated Este arquivo foi substituído pela arquitetura DDD/Hexagonal
 * @see src/modules/fiscal/domain/services/SpedContributionsGenerator.ts (novo)
 * @see src/modules/fiscal/application/use-cases/sped/GenerateSpedContributionsUseCase.ts
 * 
 * Mantido para referência histórica. NÃO use em código novo.
 * Migração: E7.18 (Jan 2026)
 * 
 * Blocos Implementados:
 * - Bloco 0: Cadastros
 * - Bloco A: Receitas
 * - Bloco C: Créditos
 * - Bloco M: Apuração
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface SpedContributionsConfig {
  organizationId: bigint;
  referenceMonth: number;
  referenceYear: number;
  finality: "ORIGINAL" | "SUBSTITUTION";
}

/**
 * Gera arquivo SPED Contribuições completo
 */
export async function generateSpedContributions(
  config: SpedContributionsConfig
): Promise<string> {
  const lines: string[] = [];

  // BLOCO 0: Abertura
  lines.push(...await generateBloco0Contrib(config));
  
  // BLOCO A: Receitas
  lines.push(...await generateBlocoA(config));
  
  // BLOCO C: Créditos
  lines.push(...await generateBlocoC_Credits(config));
  
  // BLOCO M: Apuração
  lines.push(...await generateBlocoM(config));
  
  // Bloco 9: Encerramento
  lines.push(...generateBloco9Contrib(lines.length));

  return lines.join("\n");
}

/**
 * BLOCO 0: Abertura
 */
async function generateBloco0Contrib(config: SpedContributionsConfig): Promise<string[]> {
  const lines: string[] = [];
  
  const startDate = `01${String(config.referenceMonth).padStart(2, '0')}${config.referenceYear}`;
  const endDate = new Date(config.referenceYear, config.referenceMonth, 0);
  const endDateStr = endDate.toISOString().slice(0, 10).replace(/-/g, '');
  
  // 0000: Abertura
  lines.push(`|0000|009|AURA CORE TMS|${startDate}|${endDateStr}|${config.finality === 'SUBSTITUTION' ? '1' : '0'}|`);
  
  // 0001: Abertura Bloco 0
  lines.push(`|0001|0|`);
  
  // 0035: Identificação SCP (Simplificado)
  interface OrgDocument {
    document: string;
  }
  
  const orgResult = await db.execute(sql`
    SELECT document FROM organizations WHERE id = ${config.organizationId}
  `) as unknown as OrgDocument[];
  
  lines.push(`|0035|${orgResult[0]?.document}|`);
  
  // 0100: Dados do Contabilista
  lines.push(`|0100|CONTADOR|00000000000|00000/SP|||||`);
  
  // 0990: Encerramento Bloco 0
  lines.push(`|0990|${lines.length + 2}|`);
  
  return lines;
}

/**
 * BLOCO A: Receitas
 */
async function generateBlocoA(config: SpedContributionsConfig): Promise<string[]> {
  const lines: string[] = [];
  
  // A001: Abertura Bloco A
  lines.push(`|A001|0|`);
  
  // A100: Documentos Fiscais de Saída (CTe)
  const ctesResult = await db.execute(sql`
    SELECT 
      cd.cte_number,
      cd.access_key,
      cd.issue_date,
      cd.customer_document,
      cd.total_amount,
      cd.icms_amount,
      cd.cfop
    FROM cargo_documents cd
    WHERE cd.organization_id = ${config.organizationId}
      AND MONTH(cd.issue_date) = ${config.referenceMonth}
      AND YEAR(cd.issue_date) = ${config.referenceYear}
      AND cd.deleted_at IS NULL
    ORDER BY cd.issue_date
  `);
  
  for (const cte of (ctesResult.recordset || [])) {
    const dataEmissao = new Date(cte.issue_date).toISOString().slice(0, 10).replace(/-/g, '');
    const codParticipante = cte.customer_document.replace(/\D/g, '');
    const valorTotal = parseFloat(cte.total_amount || "0");
    
    // Base de cálculo PIS/COFINS = Valor total - ICMS
    const baseCalculo = valorTotal - parseFloat(cte.icms_amount || "0");
    
    // A100: CTe
    lines.push(`|A100|0|1|${codParticipante}|57|00|${cte.cte_number}|${cte.access_key}|${dataEmissao}|${valorTotal.toFixed(2)}|01|${baseCalculo.toFixed(2)}|`);
    
    // A170: PIS
    const pisSaida = (baseCalculo * 1.65) / 100;
    lines.push(`|A170|${cte.cte_number}|01|01|${baseCalculo.toFixed(2)}|1.65|${pisSaida.toFixed(2)}||`);
    
    // A170: COFINS
    const cofinsSaida = (baseCalculo * 7.6) / 100;
    lines.push(`|A170|${cte.cte_number}|01|02|${baseCalculo.toFixed(2)}|7.6|${cofinsSaida.toFixed(2)}||`);
  }
  
  // A990: Encerramento Bloco A
  lines.push(`|A990|${lines.length + 1}|`);
  
  return lines;
}

/**
 * BLOCO C: Créditos
 */
async function generateBlocoC_Credits(config: SpedContributionsConfig): Promise<string[]> {
  const lines: string[] = [];
  
  // C001: Abertura Bloco C
  lines.push(`|C001|0|`);
  
  // C100: NFe de Entrada (com crédito)
  const nfesResult = await db.execute(sql`
    SELECT 
      fd.document_number,
      fd.access_key,
      fd.issue_date,
      fd.partner_document,
      fd.net_amount,
      fd.cfop
    FROM fiscal_documents fd
    WHERE fd.organization_id = ${config.organizationId}
      AND fd.document_type = 'NFE'
      AND fd.operation_type = 'ENTRADA'
      AND MONTH(fd.issue_date) = ${config.referenceMonth}
      AND YEAR(fd.issue_date) = ${config.referenceYear}
      AND fd.deleted_at IS NULL
    ORDER BY fd.issue_date
  `);
  
  for (const nfe of (nfesResult.recordset || [])) {
    const dataEmissao = new Date(nfe.issue_date).toISOString().slice(0, 10).replace(/-/g, '');
    const valorTotal = parseFloat(nfe.net_amount || "0");
    
    // Créditos
    const pisCredito = (valorTotal * 1.65) / 100;
    const cofinsCredito = (valorTotal * 7.6) / 100;
    
    lines.push(`|C100|0|1|${nfe.partner_document}|55|00|${nfe.document_number}|${nfe.access_key}|${dataEmissao}|${valorTotal.toFixed(2)}|${pisCredito.toFixed(2)}|${cofinsCredito.toFixed(2)}|`);
  }
  
  // C990: Encerramento Bloco C
  lines.push(`|C990|${lines.length + 1}|`);
  
  return lines;
}

/**
 * BLOCO M: Apuração de PIS/COFINS
 */
async function generateBlocoM(config: SpedContributionsConfig): Promise<string[]> {
  const lines: string[] = [];
  
  // M001: Abertura Bloco M
  lines.push(`|M001|0|`);
  
  // Calcular totais de débito e crédito
  interface TotalsResult {
    total_debit: string | number;
    total_credit: string | number;
  }
  
  const totalsResult = await db.execute(sql`
    SELECT 
      SUM(CASE WHEN je.source_type = 'TAX_DEBIT' THEN je.total_debit ELSE 0 END) as total_debit,
      SUM(CASE WHEN je.source_type = 'TAX_CREDIT' THEN je.total_credit ELSE 0 END) as total_credit
    FROM journal_entries je
    WHERE je.organization_id = ${config.organizationId}
      AND MONTH(je.entry_date) = ${config.referenceMonth}
      AND YEAR(je.entry_date) = ${config.referenceYear}
  `) as unknown as TotalsResult[];
  
  const totalDebito = parseFloat(String(totalsResult[0]?.total_debit || "0"));
  const totalCredito = parseFloat(String(totalsResult[0]?.total_credit || "0"));
  
  // M200: PIS
  const pisAPagar = Math.max(totalDebito - totalCredito, 0) * 0.179; // 1.65/9.25
  lines.push(`|M200|01|${pisAPagar.toFixed(2)}|`);
  
  // M600: COFINS
  const cofinsAPagar = Math.max(totalDebito - totalCredito, 0) * 0.821; // 7.6/9.25
  lines.push(`|M600|01|${cofinsAPagar.toFixed(2)}|`);
  
  // M990: Encerramento Bloco M
  lines.push(`|M990|${lines.length + 1}|`);
  
  return lines;
}

/**
 * BLOCO 9: Encerramento
 */
function generateBloco9Contrib(totalLines: number): string[] {
  return [
    `|9001|0|`,
    `|9900|0000|1|`,
    `|9900|0001|1|`,
    `|9900|0990|1|`,
    `|9900|A001|1|`,
    `|9900|A990|1|`,
    `|9900|C001|1|`,
    `|9900|C990|1|`,
    `|9900|M001|1|`,
    `|9900|M990|1|`,
    `|9900|9001|1|`,
    `|9900|9900|11|`,
    `|9900|9990|1|`,
    `|9900|9999|1|`,
    `|9990|${totalLines + 3}|`,
    `|9999|${totalLines + 3}|`,
  ];
}





















