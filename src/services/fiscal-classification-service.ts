import { ParsedNFe } from "./nfe-parser";

/**
 * 🏷️ FISCAL CLASSIFICATION SERVICE
 * 
 * Serviço para classificar automaticamente documentos fiscais (NFe/CTe)
 * baseado em regras de negócio de transportadoras.
 */

export type FiscalClassification = 
  | "PURCHASE"  // Compra de insumos/mercadorias
  | "RETURN"    // Devolução
  | "CARGO"     // Carga transportada (somos o transportador)
  | "SALE"      // Venda de mercadorias (futuro)
  | "OTHER";    // Não identificado

/**
 * Classifica uma NFe automaticamente baseado em regras de negócio
 * 
 * @param nfe - NFe parseada
 * @param branchCNPJ - CNPJ da filial que está importando (sem formatação)
 * @returns Classificação fiscal automática
 */
export function classifyNFe(nfe: ParsedNFe, branchCNPJ: string): FiscalClassification {
  const { operation, recipient, issuer, transporter } = nfe;
  
  // Normaliza CNPJs (remove formatação E zeros à esquerda para comparação)
  const normalizedBranchCNPJ = branchCNPJ.replace(/\D/g, "").replace(/^0+/, "");
  const recipientCNPJ = recipient.cnpj.replace(/\D/g, "").replace(/^0+/, "");
  const issuerCNPJ = issuer.cnpj.replace(/\D/g, "").replace(/^0+/, "");
  const transporterCNPJ = (transporter?.cnpj?.replace(/\D/g, "") || "").replace(/^0+/, "");
  
  const cfop = operation.cfop;
  const natureza = operation.naturezaOperacao.toUpperCase();
  
  console.log(`🔍 DEBUG Classificação:`);
  console.log(`  - Branch normalizado: ${normalizedBranchCNPJ}`);
  console.log(`  - Destinatário normalizado: ${recipientCNPJ}`);
  console.log(`  - Emitente normalizado: ${issuerCNPJ}`);
  console.log(`  - Match destinatário? ${recipientCNPJ === normalizedBranchCNPJ}`);
  
  // ====================================
  // 1. DEVOLUÇÃO (prioridade máxima)
  // ====================================
  if (
    natureza.includes("DEVOLUCAO") ||
    natureza.includes("DEVOLUÇÃO") ||
    cfop === "5202" || cfop === "6202" || // Devolução de compra (saída)
    cfop === "1202" || cfop === "2202" || // Devolução de venda (entrada)
    cfop === "5411" || cfop === "6411" || // Devolução de venda de produção
    cfop === "1411" || cfop === "2411"    // Devolução de compra para industrialização
  ) {
    return "RETURN";
  }
  
  // ====================================
  // 2. CARGA (somos o transportador)
  // ====================================
  // Se o nosso CNPJ está como transportador, é uma carga que transportamos
  if (transporterCNPJ && transporterCNPJ === normalizedBranchCNPJ) {
    return "CARGO";
  }
  
  // ====================================
  // 3. COMPRA (destinatário somos nós)
  // ====================================
  // Quando somos o DESTINATÁRIO, é sempre uma COMPRA, independente do CFOP
  // O CFOP da NFe é sempre do ponto de vista do EMITENTE:
  // - CFOP 5xxx/6xxx (saída do emitente) = COMPRA para o destinatário
  // - CFOP 1xxx/2xxx (entrada do emitente) = raro, mas também é COMPRA para o destinatário
  if (recipientCNPJ === normalizedBranchCNPJ) {
    // Ignorar CFOPs de devolução (já tratados acima)
    if (!cfop.includes("202") && !cfop.includes("411")) {
      return "PURCHASE";
    }
  }
  
  // ====================================
  // 4. VENDA (emitente somos nós)
  // ====================================
  // Quando somos o EMITENTE, é sempre uma VENDA
  // CFOPs de saída (5xxx = dentro do estado, 6xxx = fora do estado)
  if (issuerCNPJ === normalizedBranchCNPJ) {
    // Ignorar CFOPs de devolução (já tratados acima)
    if (!cfop.includes("202") && !cfop.includes("411")) {
      return "SALE";
    }
  }
  
  // ====================================
  // 5. OUTROS (não identificado)
  // ====================================
  return "OTHER";
}

/**
 * Retorna o status fiscal baseado na classificação
 */
export function getFiscalStatusFromClassification(classification: FiscalClassification): string {
  switch (classification) {
    case "PURCHASE":
    case "CARGO":
    case "RETURN":
    case "SALE":
      return "CLASSIFIED";
    case "OTHER":
    default:
      return "PENDING_CLASSIFICATION";
  }
}

/**
 * Retorna uma descrição amigável da classificação
 */
export function getClassificationDescription(classification: FiscalClassification): string {
  switch (classification) {
    case "PURCHASE":
      return "Compra de insumos/mercadorias";
    case "RETURN":
      return "Devolução";
    case "CARGO":
      return "Carga transportada";
    case "SALE":
      return "Venda de mercadorias";
    case "OTHER":
    default:
      return "Não identificado";
  }
}

