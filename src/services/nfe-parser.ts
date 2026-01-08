import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";

/**
 * 🧾 NFE PARSER SERVICE
 * 
 * Serviço para extrair dados estruturados de XMLs de NFe (Nota Fiscal Eletrônica).
 * 
 * Funcionalidades:
 * - Parse de XML NFe (modelo 55)
 * - Extração de dados do emitente (fornecedor)
 * - Extração de dados dos produtos
 * - Validação de chave de acesso
 * - Cálculo de hash do XML
 */

// Configuração do parser XML
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
});

// Interfaces para tipagem de dados do XML NFe
interface ICMSGroup {
  CST?: string;
  CSOSN?: string;
  [key: string]: unknown;
}

interface DetPagElement {
  tPag?: string | number;
  indPag?: string | number;
  vPag?: string | number;
  [key: string]: unknown;
}

/**
 * Interface para dados estruturados da NFe
 */
export interface ParsedNFe {
  // Identificação
  accessKey: string; // Chave de Acesso (44 dígitos)
  series: string;
  number: string;
  model: string; // 55=NFe, 65=NFCe
  issueDate: Date;
  
  // Emitente (Fornecedor)
  issuer: {
    cnpj: string;
    name: string;
    tradeName: string;
    ie: string; // Inscrição Estadual
    address: {
      street: string;
      number: string;
      district: string;
      cityCode: string;
      cityName: string;
      state: string;
      zipCode: string;
    };
    phone?: string;
  };
  
  // Destinatário (Quem recebeu - nossa filial)
  recipient: {
    cnpj: string;
    name: string;
  };
  
  // Dados da Operação (para classificação fiscal)
  operation: {
    naturezaOperacao: string; // "VENDA", "DEVOLUÇÃO", etc
    cfop: string; // CFOP principal da NFe
    tipoNFe: string; // 0=Entrada, 1=Saída
  };
  
  // Transportador (para identificar se somos nós)
  transporter?: {
    cnpj?: string;
    name?: string;
  };
  
  // Totais
  totals: {
    products: number; // Total dos Produtos
    nfe: number; // Total da NFe
  };
  
  // Itens
  items: Array<{
    itemNumber: number;
    productCode: string; // Código do fornecedor
    productName: string; // Descrição
    description?: string; // Descrição alternativa
    ean?: string; // EAN/GTIN
    ncm: string; // NCM (8 dígitos)
    cfop: string; // CFOP (4 dígitos)
    cst?: string; // CST
    unit: string; // Unidade (UN, KG, etc)
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    totalGross?: number; // Total bruto
    discount?: number; // Desconto
    totalNet?: number; // Total líquido
    freight?: number; // Frete
    insurance?: number; // Seguro
    otherExpenses?: number; // Outras despesas
    icms?: { value?: number; [key: string]: unknown }; // ICMS
    ipi?: { value?: number; [key: string]: unknown }; // IPI
    pis?: { value?: number; [key: string]: unknown }; // PIS
    cofins?: { value?: number; [key: string]: unknown }; // COFINS
  }>;
  
  // Pagamento (Novo!)
  payment?: {
    type: string; // Tipo de pagamento (01=Dinheiro, 15=Boleto, etc)
    indicator: string; // 0=À vista, 1=A prazo
    installments: Array<{
      number: string; // '001', '002', etc
      dueDate: Date;
      amount: number;
    }>;
  };
  
  // Metadados
  xmlHash: string; // SHA-256 do XML
  xmlContent: string; // XML original
  // Dados XML brutos (para classificação)
  nfeData: Record<string, unknown>; // Objeto XML parseado
}

/**
 * Parse do XML da NFe
 * 
 * @param xmlString - Conteúdo do arquivo XML
 * @returns Dados estruturados da NFe
 */
export async function parseNFeXML(xmlString: string): Promise<ParsedNFe> {
  try {
    // Parse do XML
    const xmlObj = parser.parse(xmlString);
    
    // Navega até a estrutura da NFe
    const nfeProc = xmlObj.nfeProc || xmlObj.NFe || xmlObj;
    const nfe = nfeProc.NFe || nfeProc;
    const infNFe = nfe.infNFe;
    
    if (!infNFe) {
      throw new Error("Estrutura de NFe inválida: tag <infNFe> não encontrada");
    }
    
    // Extrai chave de acesso
    const accessKey = infNFe["@_Id"]?.replace("NFe", "") || "";
    
    if (accessKey.length !== 44) {
      throw new Error(`Chave de acesso inválida: ${accessKey}`);
    }
    
    // Identificação da NFe
    const ide = infNFe.ide;
    const issueDate = parseNFeDate(ide.dhEmi || ide.dEmi);
    
    // Emitente (Fornecedor)
    const emit = infNFe.emit;
    const emitEnder = emit.enderEmit;
    
    const issuer = {
      cnpj: String(emit.CNPJ || emit.CPF || ""),
      name: emit.xNome || "",
      tradeName: emit.xFant || emit.xNome || "",
      ie: String(emit.IE || ""),
      address: {
        street: emitEnder.xLgr || "",
        number: String(emitEnder.nro || ""),
        district: emitEnder.xBairro || "",
        cityCode: String(emitEnder.cMun || ""),
        cityName: emitEnder.xMun || "",
        state: emitEnder.UF || "",
        zipCode: emitEnder.CEP ? String(emitEnder.CEP).replace(/\D/g, "") : "",
      },
      phone: emit.enderEmit?.fone ? String(emit.enderEmit.fone) : undefined,
    };
    
    // Destinatário
    const dest = infNFe.dest;
    const recipient = {
      cnpj: String(dest.CNPJ || dest.CPF || ""),
      name: dest.xNome || "",
    };
    
    // Totais
    const total = infNFe.total.ICMSTot;
    const totals = {
      products: parseFloat(total.vProd) || 0,
      nfe: parseFloat(total.vNF) || 0,
    };
    
    // Itens
    let detArray = infNFe.det;
    if (!Array.isArray(detArray)) {
      detArray = [detArray]; // Converte para array se for item único
    }
    
    interface ProdInfo {
      cProd?: unknown;
      xProd?: string;
      cEAN?: unknown;
      NCM?: unknown;
      CFOP?: unknown;
      uCom?: string;
      qCom?: unknown;
      vUnCom?: unknown;
      vProd?: unknown;
    }
    
    const items = detArray.map((det: Record<string, unknown>, index: number) => {
      const prod = det.prod as ProdInfo;
      const imposto = det.imposto;
      
      // Extrai CST (pode estar em ICMS, ICMSSN, etc)
      let cst = "";
      if (imposto?.ICMS) {
        const icmsValues = Object.values(imposto.ICMS) as unknown as ICMSGroup[];
        const icmsGroup = icmsValues[0];
        cst = icmsGroup?.CST || icmsGroup?.CSOSN || "";
      }
      
      return {
        itemNumber: parseInt(det["@_nItem"]) || index + 1,
        productCode: String(prod.cProd || ""),
        productName: prod.xProd || "",
        ean: prod.cEAN && String(prod.cEAN) !== "SEM GTIN" ? String(prod.cEAN) : undefined,
        ncm: String(prod.NCM || ""),
        cfop: String(prod.CFOP || ""),
        cst: String(cst || ""),
        unit: prod.uCom || "UN",
        quantity: parseFloat(prod.qCom) || 0,
        unitPrice: parseFloat(prod.vUnCom) || 0,
        totalPrice: parseFloat(prod.vProd) || 0,
      };
    });
    
    // Dados da Operação (para classificação fiscal)
    const operation = {
      naturezaOperacao: ide.natOp || "",
      cfop: items[0]?.cfop || "", // CFOP do primeiro item (geralmente todos iguais)
      tipoNFe: ide.tpNF ? String(ide.tpNF) : "0", // 0=Entrada, 1=Saída
    };
    
    // Transportador (para identificar se somos nós)
    const transp = infNFe.transp;
    let transporter = undefined;
    if (transp?.transporta) {
      transporter = {
        cnpj: String(transp.transporta.CNPJ || transp.transporta.CPF || ""),
        name: transp.transporta.xNome || "",
      };
    }
    
    // Extrai informações de pagamento (novo!)
    const payment = extractPaymentInfo(infNFe);
    
    // Calcula hash do XML
    const xmlHash = crypto
      .createHash("sha256")
      .update(xmlString)
      .digest("hex");
    
    return {
      accessKey,
      series: ide.serie?.toString() || "",
      number: ide.nNF?.toString() || "",
      model: ide.mod?.toString() || "55",
      issueDate,
      issuer,
      recipient,
      operation,
      transporter,
      totals,
      items,
      payment,
      xmlHash,
      xmlContent: xmlString,
      nfeData: infNFe, // Dados brutos para classificação
    };
  } catch (error: unknown) {
    console.error("❌ Erro ao fazer parse do XML:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Falha ao processar XML da NFe: ${errorMessage}`);
  }
}

/**
 * Converte data/hora da NFe para objeto Date
 * 
 * Formatos suportados:
 * - 2024-12-05T14:30:00-03:00 (dhEmi - data/hora com timezone)
 * - 2024-12-05 (dEmi - apenas data)
 */
function parseNFeDate(dateStr: string): Date {
  if (!dateStr) {
    return new Date();
  }
  
  // Remove timezone se houver
  const dateParts = dateStr.split(/[+-]\d{2}:\d{2}/);
  const cleanDate = dateParts[0] || dateStr;
  
  return new Date(cleanDate);
}

/**
 * Valida se o XML é uma NFe válida
 */
export function isValidNFeXML(xmlString: string): boolean {
  try {
    const xmlObj = parser.parse(xmlString);
    const nfeProc = xmlObj.nfeProc || xmlObj.NFe || xmlObj;
    const nfe = nfeProc.NFe || nfeProc;
    
    return !!nfe?.infNFe;
  } catch {
    return false;
  }
}

/**
 * Extrai informações de pagamento da NFe
 */
interface InfNFePartial {
  pag?: {
    detPag?: unknown;
  };
  cobr?: {
    dup?: unknown;
  };
  ide?: {
    dhEmi?: string;
    dEmi?: string;
  };
}

function extractPaymentInfo(infNFe: Record<string, unknown>): ParsedNFe['payment'] | undefined {
  try {
    const typedInfNFe = infNFe as InfNFePartial;
    
    // Tag <pag> - Formas de Pagamento
    const pag = typedInfNFe.pag;
    if (!pag) {
      return undefined;
    }
    
    // <detPag> pode ser array ou objeto único
    let detPagArray = pag.detPag;
    if (!Array.isArray(detPagArray)) {
      detPagArray = [detPagArray];
    }
    
    const detPagElements = detPagArray as unknown as DetPagElement[];
    const firstPag = detPagElements[0];
    if (!firstPag) {
      return undefined;
    }
    
    const paymentType = firstPag.tPag?.toString() || "99";
    const paymentIndicator = firstPag.indPag?.toString() || "0";
    
    // Tag <cobr><dup> - Duplicatas/Parcelas
    const cobr = typedInfNFe.cobr;
    const installments: Array<{ number: string; dueDate: Date; amount: number }> = [];
    
    if (cobr && cobr.dup) {
      let dupArray = cobr.dup;
      if (!Array.isArray(dupArray)) {
        dupArray = [dupArray];
      }
      
      for (const dup of dupArray) {
        if (dup.nDup && dup.dVenc && dup.vDup) {
          installments.push({
            number: dup.nDup.toString(),
            dueDate: new Date(dup.dVenc),
            amount: parseFloat(dup.vDup),
          });
        }
      }
    }
    
    // Se não há duplicatas mas há pagamento, cria 1 parcela (à vista)
    if (installments.length === 0 && firstPag.vPag && typedInfNFe.ide) {
      // Usa parseNFeDate para garantir data válida
      const issueDateStr = typedInfNFe.ide.dhEmi || typedInfNFe.ide.dEmi;
      const issueDate = issueDateStr ? parseNFeDate(issueDateStr) : new Date();
      
      installments.push({
        number: "001",
        dueDate: issueDate, // Vence no mesmo dia (à vista)
        amount: parseFloat(String(firstPag.vPag)),
      });
    }
    
    return {
      type: paymentType,
      indicator: paymentIndicator,
      installments,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("⚠️  Erro ao extrair informações de pagamento:", errorMessage);
    return undefined;
  }
}

/**
 * Extrai apenas a chave de acesso do XML (rápido)
 */
export function extractAccessKey(xmlString: string): string | null {
  try {
    const xmlObj = parser.parse(xmlString);
    const nfeProc = xmlObj.nfeProc || xmlObj.NFe || xmlObj;
    const nfe = nfeProc.NFe || nfeProc;
    const infNFe = nfe.infNFe;
    
    const accessKey = infNFe?.["@_Id"]?.replace("NFe", "") || "";
    
    return accessKey.length === 44 ? accessKey : null;
  } catch {
    return null;
  }
}

