/**
 * 📄 SPED ECD GENERATOR
 * Geração de Escrituração Contábil Digital
 * 
 * Blocos Implementados:
 * - Bloco 0: Cadastros
 * - Bloco I: Lançamentos Contábeis (Livro Diário)
 * - Bloco J: Plano de Contas
 * - Bloco K: Saldos das Contas (Razão)
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface SpedECDConfig {
  organizationId: bigint;
  referenceYear: number;
  bookType: "G" | "R"; // G = Livro Geral, R = Livro Razão Auxiliar
}

/**
 * Gera arquivo ECD completo
 */
export async function generateSpedECD(
  config: SpedECDConfig
): Promise<string> {
  const lines: string[] = [];

  // BLOCO 0: Abertura
  lines.push(...await generateBloco0ECD(config));
  
  // BLOCO J: Plano de Contas
  lines.push(...await generateBlocoJ(config));
  
  // BLOCO I: Lançamentos Contábeis
  lines.push(...await generateBlocoI(config));
  
  // BLOCO K: Saldos
  lines.push(...await generateBlocoK(config));
  
  // Bloco 9: Encerramento
  lines.push(...generateBloco9ECD(lines.length));

  return lines.join("\n");
}

/**
 * BLOCO 0: Abertura
 */
async function generateBloco0ECD(config: SpedECDConfig): Promise<string[]> {
  const lines: string[] = [];
  
  const startDate = `0101${config.referenceYear}`;
  const endDate = `3112${config.referenceYear}`;
  
  // 0000: Abertura
  lines.push(`|0000|LECDE|010000|${startDate}|${endDate}|AURA CORE TMS||0|${config.bookType}|A|`);
  
  // 0001: Abertura Bloco 0
  lines.push(`|0001|0|`);
  
  // 0007: Dados da Empresa
  const orgResult = await db.execute(sql`
    SELECT document, name FROM organizations WHERE id = ${config.organizationId}
  `);
  
  const org = orgResult[0];
  lines.push(`|0007|${org.document}|${org.name}||||||||`);
  
  // 0020: Dados do Contabilista
  lines.push(`|0020|CONTADOR RESPONSAVEL|00000000000|00000/SP||||||`);
  
  // 0990: Encerramento Bloco 0
  lines.push(`|0990|${lines.length + 2}|`);
  
  return lines;
}

/**
 * BLOCO J: Plano de Contas
 */
async function generateBlocoJ(config: SpedECDConfig): Promise<string[]> {
  const lines: string[] = [];
  
  // J001: Abertura Bloco J
  lines.push(`|J001|0|`);
  
  // J005: Plano de Contas
  const accountsResult = await db.execute(sql`
    SELECT 
      code,
      name,
      type,
      parent_id,
      is_analytical
    FROM chart_of_accounts
    WHERE organization_id = ${config.organizationId}
      AND deleted_at IS NULL
    ORDER BY code
  `);
  
  for (const account of (accountsResult.recordset || [])) {
    const parentResult = account.parent_id ? await db.execute(sql`
      SELECT code FROM chart_of_accounts WHERE id = ${account.parent_id}
    `) : null;
    
    const parentCode = parentResult?.[0]?.code || '';
    const tipoSaldo = account.type === 'ASSET' ? 'D' : 'C'; // Débito ou Crédito
    const nivel = account.code.split('.').length;
    
    lines.push(`|J005|${account.code}|${account.name}|${parentCode}|${nivel}|${account.is_analytical === 'true' ? 'A' : 'S'}|${tipoSaldo}|`);
  }
  
  // J990: Encerramento Bloco J
  lines.push(`|J990|${lines.length + 1}|`);
  
  return lines;
}

/**
 * BLOCO I: Lançamentos Contábeis (Livro Diário)
 */
async function generateBlocoI(config: SpedECDConfig): Promise<string[]> {
  const lines: string[] = [];
  
  // I001: Abertura Bloco I
  lines.push(`|I001|0|`);
  
  // Buscar todos lançamentos do ano
  const entriesResult = await db.execute(sql`
    SELECT 
      je.id,
      je.entry_number,
      je.entry_date,
      je.description
    FROM journal_entries je
    WHERE je.organization_id = ${config.organizationId}
      AND YEAR(je.entry_date) = ${config.referenceYear}
      AND je.status = 'POSTED'
      AND je.deleted_at IS NULL
    ORDER BY je.entry_date, je.entry_number
  `);
  
  for (const entry of (entriesResult.recordset || [])) {
    const dataLancamento = new Date(entry.entry_date).toISOString().slice(0, 10).replace(/-/g, '');
    
    // I200: Lançamento
    lines.push(`|I200|${entry.entry_number}|${dataLancamento}|0.00|${entry.description}||`);
    
    // I250: Partidas (Débito/Crédito)
    const linesResult = await db.execute(sql`
      SELECT 
        jel.line_number,
        ca.code as account_code,
        jel.debit_amount,
        jel.credit_amount,
        jel.description
      FROM journal_entry_lines jel
      INNER JOIN chart_of_accounts ca ON ca.id = jel.chart_account_id
      WHERE jel.journal_entry_id = ${entry.id}
      ORDER BY jel.line_number
    `);
    
    for (const line of (linesResult.recordset || [])) {
      const valorDebito = parseFloat(line.debit_amount || "0");
      const valorCredito = parseFloat(line.credit_amount || "0");
      
      if (valorDebito > 0) {
        lines.push(`|I250|${line.account_code}|${valorDebito.toFixed(2)}|D|`);
      }
      if (valorCredito > 0) {
        lines.push(`|I250|${line.account_code}|${valorCredito.toFixed(2)}|C|`);
      }
    }
  }
  
  // I990: Encerramento Bloco I
  lines.push(`|I990|${lines.length + 1}|`);
  
  return lines;
}

/**
 * BLOCO K: Saldos das Contas (Razão)
 */
async function generateBlocoK(config: SpedECDConfig): Promise<string[]> {
  const lines: string[] = [];
  
  // K001: Abertura Bloco K
  lines.push(`|K001|0|`);
  
  // K155: Saldos Finais
  const saldosResult = await db.execute(sql`
    SELECT 
      ca.code,
      SUM(jel.debit_amount) as total_debit,
      SUM(jel.credit_amount) as total_credit
    FROM chart_of_accounts ca
    LEFT JOIN journal_entry_lines jel ON jel.chart_account_id = ca.id
    LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
    WHERE ca.organization_id = ${config.organizationId}
      AND ca.deleted_at IS NULL
      AND (je.id IS NULL OR YEAR(je.entry_date) = ${config.referenceYear})
    GROUP BY ca.code
    ORDER BY ca.code
  `);
  
  for (const saldo of (saldosResult.recordset || [])) {
    const totalDebito = parseFloat(saldo.total_debit || "0");
    const totalCredito = parseFloat(saldo.total_credit || "0");
    const saldoFinal = Math.abs(totalDebito - totalCredito);
    const indicadorSaldo = totalDebito >= totalCredito ? 'D' : 'C';
    
    if (saldoFinal > 0) {
      const dataFinal = `3112${config.referenceYear}`;
      lines.push(`|K155|${dataFinal}|${saldo.code}|${saldoFinal.toFixed(2)}|${indicadorSaldo}|`);
    }
  }
  
  // K990: Encerramento Bloco K
  lines.push(`|K990|${lines.length + 1}|`);
  
  return lines;
}

/**
 * BLOCO 9: Encerramento
 */
function generateBloco9ECD(totalLines: number): string[] {
  return [
    `|9001|0|`,
    `|9900|0000|1|`,
    `|9900|0001|1|`,
    `|9900|0990|1|`,
    `|9900|J001|1|`,
    `|9900|J990|1|`,
    `|9900|I001|1|`,
    `|9900|I990|1|`,
    `|9900|K001|1|`,
    `|9900|K990|1|`,
    `|9900|9001|1|`,
    `|9900|9900|11|`,
    `|9900|9990|1|`,
    `|9900|9999|1|`,
    `|9990|${totalLines + 3}|`,
    `|9999|${totalLines + 3}|`,
  ];
}















