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
    ean?: string; // EAN/GTIN
    ncm: string; // NCM (8 dígitos)
    cfop: string; // CFOP (4 dígitos)
    cst?: string; // CST
    unit: string; // Unidade (UN, KG, etc)
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  
  // Metadados
  xmlHash: string; // SHA-256 do XML
  xmlContent: string; // XML original
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
    
    const items = detArray.map((det: any, index: number) => {
      const prod = det.prod;
      const imposto = det.imposto;
      
      // Extrai CST (pode estar em ICMS, ICMSSN, etc)
      let cst = "";
      if (imposto?.ICMS) {
        const icmsGroup = Object.values(imposto.ICMS)[0] as any;
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
      totals,
      items,
      xmlHash,
      xmlContent: xmlString,
    };
  } catch (error: any) {
    console.error("❌ Erro ao fazer parse do XML:", error);
    throw new Error(`Falha ao processar XML da NFe: ${error.message}`);
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
  const cleanDate = dateStr.split(/[+-]\d{2}:\d{2}/)[0];
  
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

