/**
 * 📄 SPED FISCAL GENERATOR
 * Geração de arquivo EFD-ICMS/IPI (Escrituração Fiscal Digital)
 * 
 * Blocos Implementados:
 * - Bloco 0: Cadastros
 * - Bloco C: Documentos Fiscais (NFe de Entrada)
 * - Bloco D: Serviços (CTe)
 * - Bloco E: Apuração ICMS
 * - Bloco H: Inventário
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface SpedFiscalConfig {
  organizationId: bigint;
  referenceMonth: number; // 1-12
  referenceYear: number;
  finality: "ORIGINAL" | "SUBSTITUTION";
}

/**
 * Gera arquivo SPED Fiscal completo
 */
export async function generateSpedFiscal(
  config: SpedFiscalConfig
): Promise<string> {
  const lines: string[] = [];

  // BLOCO 0: Abertura e Cadastros
  lines.push(...await generateBloco0(config));
  
  // BLOCO C: Documentos Fiscais (NFe)
  lines.push(...await generateBlocoC(config));
  
  // BLOCO D: Serviços (CTe)
  lines.push(...await generateBlocoD(config));
  
  // BLOCO E: Apuração ICMS
  lines.push(...await generateBlocoE(config));
  
  // BLOCO H: Inventário
  lines.push(...await generateBlocoH(config));
  
  // Bloco 9: Encerramento
  lines.push(...generateBloco9(lines.length));

  return lines.join("\n");
}

/**
 * BLOCO 0: Abertura, Identificação e Cadastros
 */
async function generateBloco0(config: SpedFiscalConfig): Promise<string[]> {
  const lines: string[] = [];
  
  // 0000: Abertura do Arquivo
  const startDate = `01${String(config.referenceMonth).padStart(2, '0')}${config.referenceYear}`;
  const endDate = new Date(config.referenceYear, config.referenceMonth, 0);
  const endDateStr = endDate.toISOString().slice(0, 10).replace(/-/g, '');
  
  lines.push(`|0000|014|0|${startDate}|${endDateStr}|AURA CORE TMS|01|A|${config.finality === 'SUBSTITUTION' ? '1' : '0'}|0|G||`);
  
  // 0001: Abertura do Bloco 0
  lines.push(`|0001|0|`);
  
  // 0005: Dados Complementares da Empresa
  const orgResult = await db.execute(sql`
    SELECT name, document 
    FROM organizations 
    WHERE id = ${config.organizationId}
  `);
  
  const org = orgResult[0];
  
  lines.push(`|0005|${org.name}|${org.document}||||||||`);
  
  // 0100: Dados do Contabilista (Simplificado)
  lines.push(`|0100|CONTADOR RESPONSAVEL|00000000000|00000/SP||||||`);
  
  // 0150: Participantes (Fornecedores/Clientes)
  const partnersResult = await db.execute(sql`
    SELECT DISTINCT 
      bp.document,
      bp.legal_name,
      bp.fantasy_name,
      bp.address_street,
      bp.address_city,
      bp.address_state,
      bp.address_zip_code
    FROM business_partners bp
    INNER JOIN fiscal_documents fd ON fd.partner_id = bp.id
    WHERE fd.organization_id = ${config.organizationId}
      AND MONTH(fd.issue_date) = ${config.referenceMonth}
      AND YEAR(fd.issue_date) = ${config.referenceYear}
      AND fd.deleted_at IS NULL
  `);
  
  for (const partner of (partnersResult.recordset || [])) {
    const codParticipante = partner.document.replace(/\D/g, '');
    const tipoParticipante = codParticipante.length === 11 ? '01' : '02'; // CPF ou CNPJ
    
    lines.push(`|0150|${codParticipante}|${partner.legal_name}||${tipoParticipante}||||||||||`);
  }
  
  // 0190: Cadastro de Contas Contábeis
  const accountsResult = await db.execute(sql`
    SELECT code, name 
    FROM chart_of_accounts
    WHERE organization_id = ${config.organizationId}
      AND deleted_at IS NULL
    ORDER BY code
  `);
  
  for (const account of (accountsResult.recordset || [])) {
    lines.push(`|0190|${account.code}|${account.name}|`);
  }
  
  // 0990: Encerramento do Bloco 0
  lines.push(`|0990|${lines.length + 2}|`); // +2 porque conta 0001 e 0990
  
  return lines;
}

/**
 * BLOCO C: Documentos Fiscais (NFe)
 */
async function generateBlocoC(config: SpedFiscalConfig): Promise<string[]> {
  const lines: string[] = [];
  
  // C001: Abertura do Bloco C
  lines.push(`|C001|0|`);
  
  // C100: Nota Fiscal (Modelo 55)
  const nfesResult = await db.execute(sql`
    SELECT 
      fd.document_number,
      fd.document_series,
      fd.access_key,
      fd.issue_date,
      fd.partner_document,
      fd.partner_name,
      fd.gross_amount,
      fd.tax_amount,
      fd.net_amount,
      fd.cfop
    FROM fiscal_documents fd
    WHERE fd.organization_id = ${config.organizationId}
      AND fd.document_type = 'NFE'
      AND MONTH(fd.issue_date) = ${config.referenceMonth}
      AND YEAR(fd.issue_date) = ${config.referenceYear}
      AND fd.deleted_at IS NULL
    ORDER BY fd.issue_date, fd.document_number
  `);
  
  for (const nfe of (nfesResult.recordset || [])) {
    const dataEmissao = new Date(nfe.issue_date).toISOString().slice(0, 10).replace(/-/g, '');
    const codParticipante = nfe.partner_document.replace(/\D/g, '');
    
    // C100: NFe
    lines.push(`|C100|0|1|${codParticipante}|55|00|${nfe.document_number}|${nfe.access_key}|${dataEmissao}|${dataEmissao}|${nfe.gross_amount}|0|${nfe.net_amount}||||||`);
    
    // C190: Totalizador por CFOP
    lines.push(`|C190|${nfe.cfop}|${nfe.gross_amount}||||||`);
  }
  
  // C990: Encerramento do Bloco C
  lines.push(`|C990|${lines.length + 1}|`);
  
  return lines;
}

/**
 * BLOCO D: Documentos Fiscais de Serviços (CTe)
 */
async function generateBlocoD(config: SpedFiscalConfig): Promise<string[]> {
  const lines: string[] = [];
  
  // D001: Abertura do Bloco D
  lines.push(`|D001|0|`);
  
  // D100: CTe
  const ctesResult = await db.execute(sql`
    SELECT 
      cd.cte_number,
      cd.cte_series,
      cd.access_key,
      cd.issue_date,
      cd.customer_document,
      cd.customer_name,
      cd.total_amount,
      cd.icms_amount,
      cd.cfop
    FROM cargo_documents cd
    WHERE cd.organization_id = ${config.organizationId}
      AND MONTH(cd.issue_date) = ${config.referenceMonth}
      AND YEAR(cd.issue_date) = ${config.referenceYear}
      AND cd.deleted_at IS NULL
    ORDER BY cd.issue_date, cd.cte_number
  `);
  
  for (const cte of (ctesResult.recordset || [])) {
    const dataEmissao = new Date(cte.issue_date).toISOString().slice(0, 10).replace(/-/g, '');
    const codParticipante = cte.customer_document.replace(/\D/g, '');
    
    // D100: CTe
    lines.push(`|D100|0|1|${codParticipante}|57|00|${cte.cte_number}|${cte.access_key}|${dataEmissao}|${dataEmissao}|${cte.total_amount}|||||||`);
    
    // D190: Totalizador por CFOP
    lines.push(`|D190|${cte.cfop}|${cte.total_amount}|${cte.icms_amount}||||`);
  }
  
  // D990: Encerramento do Bloco D
  lines.push(`|D990|${lines.length + 1}|`);
  
  return lines;
}

/**
 * BLOCO E: Apuração ICMS
 */
async function generateBlocoE(config: SpedFiscalConfig): Promise<string[]> {
  const lines: string[] = [];
  
  // E001: Abertura do Bloco E
  lines.push(`|E001|0|`);
  
  // E100: Período da Apuração
  const startDate = `01${String(config.referenceMonth).padStart(2, '0')}${config.referenceYear}`;
  const endDate = new Date(config.referenceYear, config.referenceMonth, 0);
  const endDateStr = endDate.toISOString().slice(0, 10).replace(/-/g, '');
  
  lines.push(`|E100|${startDate}|${endDateStr}|`);
  
  // E110: Apuração ICMS (Simplificado)
  const apuracaoResult = await db.execute(sql`
    SELECT 
      SUM(CASE WHEN fd.operation_type = 'SAIDA' THEN fd.tax_amount ELSE 0 END) as icms_debito,
      SUM(CASE WHEN fd.operation_type = 'ENTRADA' THEN fd.tax_amount ELSE 0 END) as icms_credito
    FROM fiscal_documents fd
    WHERE fd.organization_id = ${config.organizationId}
      AND MONTH(fd.issue_date) = ${config.referenceMonth}
      AND YEAR(fd.issue_date) = ${config.referenceYear}
      AND fd.deleted_at IS NULL
  `);
  
  const icmsDebito = parseFloat(apuracaoResult[0]?.icms_debito || "0");
  const icmsCredito = parseFloat(apuracaoResult[0]?.icms_credito || "0");
  const saldoApurar = icmsDebito - icmsCredito;
  
  lines.push(`|E110|${icmsDebito.toFixed(2)}|0|${icmsCredito.toFixed(2)}|0|0|0|${Math.max(saldoApurar, 0).toFixed(2)}|0|0|`);
  
  // E990: Encerramento do Bloco E
  lines.push(`|E990|${lines.length + 1}|`);
  
  return lines;
}

/**
 * BLOCO H: Inventário
 */
async function generateBlocoH(config: SpedFiscalConfig): Promise<string[]> {
  const lines: string[] = [];
  
  // H001: Abertura do Bloco H
  lines.push(`|H001|0|`);
  
  // H005: Totalizador do Inventário
  const lastDay = new Date(config.referenceYear, config.referenceMonth, 0);
  const inventoryDate = lastDay.toISOString().slice(0, 10).replace(/-/g, '');
  
  lines.push(`|H005|${inventoryDate}|0.00|01|`);
  
  // H990: Encerramento do Bloco H
  lines.push(`|H990|${lines.length + 1}|`);
  
  return lines;
}

/**
 * BLOCO 9: Controle e Encerramento
 */
function generateBloco9(totalLines: number): string[] {
  return [
    `|9001|0|`,
    `|9900|0000|1|`,
    `|9900|0001|1|`,
    `|9900|0005|1|`,
    `|9900|0990|1|`,
    `|9900|C001|1|`,
    `|9900|C990|1|`,
    `|9900|D001|1|`,
    `|9900|D990|1|`,
    `|9900|E001|1|`,
    `|9900|E990|1|`,
    `|9900|H001|1|`,
    `|9900|H990|1|`,
    `|9900|9001|1|`,
    `|9900|9900|14|`,
    `|9900|9990|1|`,
    `|9900|9999|1|`,
    `|9990|${totalLines + 3}|`,
    `|9999|${totalLines + 3}|`,
  ];
}

/**
 * Valida arquivo SPED antes de gerar
 */
export async function validateSpedData(
  config: SpedFiscalConfig
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Validação 1: Organização existe
  const orgResult = await db.execute(sql`
    SELECT id FROM organizations WHERE id = ${config.organizationId}
  `);
  
  if (!orgResult[0]) {
    errors.push("Organização não encontrada");
  }

  // Validação 2: Período válido
  if (config.referenceMonth < 1 || config.referenceMonth > 12) {
    errors.push("Mês inválido (deve ser 1-12)");
  }

  if (config.referenceYear < 2000 || config.referenceYear > 2100) {
    errors.push("Ano inválido");
  }

  // Validação 3: Verificar se há documentos fiscais no período
  const docsResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM fiscal_documents
    WHERE organization_id = ${config.organizationId}
      AND MONTH(issue_date) = ${config.referenceMonth}
      AND YEAR(issue_date) = ${config.referenceYear}
      AND deleted_at IS NULL
  `);

  const docCount = docsResult[0]?.count || 0;
  if (docCount === 0) {
    errors.push(`Nenhum documento fiscal encontrado para ${config.referenceMonth}/${config.referenceYear}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}













