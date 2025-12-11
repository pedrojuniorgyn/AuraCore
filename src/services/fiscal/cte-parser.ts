import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";

/**
 * 🚚 CTe PARSER
 * 
 * Extrai informações de um XML de CTe (Conhecimento de Transporte Eletrônico)
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
});

export interface ParsedCTe {
  accessKey: string;
  cteNumber: string;
  series: string;
  model: string;
  issueDate: Date;

  // Emitente
  issuer: {
    cnpj: string;
    name: string;
    tradeName?: string;
    ie?: string;
  };

  // Remetente
  sender: {
    cnpj: string;
    name: string;
  };

  // Destinatário
  recipient: {
    cnpj: string;
    name: string;
  };

  // Expedidor (opcional)
  shipper?: {
    cnpj: string;
    name: string;
  };

  // Recebedor (opcional)
  receiver?: {
    cnpj: string;
    name: string;
  };

  // Origem
  origin: {
    city: string;
    uf: string;
  };

  // Destino
  destination: {
    city: string;
    uf: string;
  };

  // Valores
  values: {
    total: number;
    cargo: number;
    icms?: number;
  };

  // Carga
  cargo: {
    weight?: number;
    volume?: number;
  };

  // NFe vinculada
  linkedNfeKeys: string[];

  // XML
  xmlContent: string;
  xmlHash: string;
}

/**
 * Parse XML de CTe
 */
export async function parseCTeXML(xmlContent: string): Promise<ParsedCTe> {
  try {
    const parsedXml = parser.parse(xmlContent);

    // Navega até o CTe
    let cteNode = parsedXml.cteProc?.CTe?.infCte;

    if (!cteNode) {
      // Tenta sem procCTe (XML sem protocolo)
      cteNode = parsedXml.CTe?.infCte;
    }

    if (!cteNode) {
      throw new Error("Estrutura de CTe inválida (infCte não encontrado)");
    }

    // Chave de Acesso
    const accessKey = cteNode["@_Id"]?.replace("CTe", "") || "";

    // Identificação
    const ide = cteNode.ide;
    const cteNumber = ide.nCT?.toString() || "";
    const series = ide.serie?.toString() || "1";
    const model = ide.mod?.toString() || "57";
    const issueDate = parseDate(ide.dhEmi);

    // Emitente
    const emit = cteNode.emit;
    const issuer = {
      cnpj: emit.CNPJ || "",
      name: emit.xNome || "",
      tradeName: emit.xFant,
      ie: emit.IE,
    };

    // Remetente
    const rem = cteNode.rem || {};
    const sender = {
      cnpj: rem.CNPJ || rem.CPF || "",
      name: rem.xNome || "",
    };

    // Destinatário
    const dest = cteNode.dest || {};
    const recipient = {
      cnpj: dest.CNPJ || dest.CPF || "",
      name: dest.xNome || "",
    };

    // Expedidor (opcional)
    const exped = cteNode.exped;
    const shipper = exped
      ? {
          cnpj: exped.CNPJ || exped.CPF || "",
          name: exped.xNome || "",
        }
      : undefined;

    // Recebedor (opcional)
    const receb = cteNode.receb;
    const receiver = receb
      ? {
          cnpj: receb.CNPJ || receb.CPF || "",
          name: receb.xNome || "",
        }
      : undefined;

    // Origem e Destino
    const origin = {
      city: ide.xMunIni || "",
      uf: ide.UFIni || "",
    };

    const destination = {
      city: ide.xMunFim || "",
      uf: ide.UFFim || "",
    };

    // Valores
    const vPrest = cteNode.vPrest || {};
    const values = {
      total: parseFloat(vPrest.vRec || vPrest.vTPrest || 0),
      cargo: parseFloat(cteNode.infCarga?.vCarga || 0),
      icms: parseFloat(cteNode.imp?.ICMS?.ICMS00?.vICMS || cteNode.imp?.ICMS?.ICMS20?.vICMS || 0),
    };

    // Carga
    const infCarga = cteNode.infCarga || {};
    const cargo = {
      weight: parseFloat(infCarga.vCarga || 0),
      volume: parseFloat(infCarga.qCarga || 0),
    };

    // NFes vinculadas
    const linkedNfeKeys: string[] = [];
    const infDoc = cteNode.infDoc;

    if (infDoc) {
      // Pode ter infNFe ou infOutros
      const infNFeArray = Array.isArray(infDoc.infNFe)
        ? infDoc.infNFe
        : infDoc.infNFe
        ? [infDoc.infNFe]
        : [];

      for (const nfe of infNFeArray) {
        if (nfe.chave) {
          linkedNfeKeys.push(nfe.chave);
        }
      }
    }

    // Hash do XML
    const xmlHash = crypto.createHash("sha256").update(xmlContent).digest("hex");

    return {
      accessKey,
      cteNumber,
      series,
      model,
      issueDate,
      issuer,
      sender,
      recipient,
      shipper,
      receiver,
      origin,
      destination,
      values,
      cargo,
      linkedNfeKeys,
      xmlContent,
      xmlHash,
    };
  } catch (error: any) {
    throw new Error(`Erro ao parsear CTe: ${error.message}`);
  }
}

/**
 * Helper: Parse data/hora da SEFAZ
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) {
    return new Date();
  }

  // Formato: 2024-01-15T10:30:00-03:00
  return new Date(dateStr);
}








