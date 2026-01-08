/**
 * NFE CLASSIFIER SERVICE
 * OPÇÃO A - Bloco 1
 * 
 * Classifica NFes automaticamente baseado no papel da empresa:
 * - PURCHASE: Somos o destinatário (NFe de compra - diesel, peças, etc)
 * - CARGO: Somos o transportador (NFe do cliente para transporte)
 * - RETURN: Somos o remetente (NFe de devolução)
 * - OTHER: Outros casos
 */

export type NFeType = "PURCHASE" | "CARGO" | "RETURN" | "OTHER";

export interface CargoMetadata {
  // Emitente (cliente)
  issuer: {
    cnpj: string;
    name: string;
    address: {
      street: string;
      number: string;
      city: string;
      uf: string;
    };
  };
  
  // Destinatário final
  recipient: {
    cnpj: string;
    name: string;
    address: {
      street: string;
      number: string;
      city: string;
      uf: string;
    };
  };
  
  // Transportador (nós)
  carrier: {
    cnpj: string;
    name: string;
  };
  
  // Dados da carga
  value: number;
  weight: number;
  volume: number;
  
  // Rota
  origin: {
    city: string;
    uf: string;
  };
  destination: {
    city: string;
    uf: string;
  };
}

/**
 * Interfaces para estruturas do XML NFe
 */
interface NFeParticipant {
  CNPJ?: unknown;
  CPF?: unknown;
  xNome?: unknown;
}

interface NFeXmlStructure {
  dest?: NFeParticipant;
  emit?: NFeParticipant;
  transp?: {
    transporta?: NFeParticipant;
    vol?: unknown;
  };
  enderEmit?: Record<string, unknown>;
  enderDest?: Record<string, unknown>;
  total?: {
    ICMSTot?: Record<string, unknown>;
  };
}

/**
 * Classifica uma NFe baseado em quem é o destinatário e quem é o transportador
 */
export function classifyNFe(nfeXml: Record<string, unknown>, branchCnpj: string): NFeType {
  try {
    // Normalizar CNPJ da filial (remover formatação)
    const cleanBranchCnpj = branchCnpj.replace(/[^\d]/g, "");
    
    // Type cast para estrutura tipada
    const typedNfe = nfeXml as NFeXmlStructure;
    
    // Extrair CNPJs do XML
    const destCnpj = typedNfe.dest?.CNPJ || typedNfe.dest?.CPF || "";
    const emitCnpj = typedNfe.emit?.CNPJ || typedNfe.emit?.CPF || "";
    const transpCnpj = typedNfe.transp?.transporta?.CNPJ || "";
    
    // Normalizar CNPJs (remover formatação)
    const cleanDestCnpj = destCnpj.toString().replace(/[^\d]/g, "");
    const cleanEmitCnpj = emitCnpj.toString().replace(/[^\d]/g, "");
    const cleanTranspCnpj = transpCnpj.toString().replace(/[^\d]/g, "");
    
    console.log("🔍 Classificando NFe:");
    console.log("  - Branch CNPJ:", cleanBranchCnpj);
    console.log("  - Destinatário:", cleanDestCnpj);
    console.log("  - Emitente:", cleanEmitCnpj);
    console.log("  - Transportador:", cleanTranspCnpj);
    
    // REGRA 1: Se somos o destinatário = PURCHASE (compra)
    if (cleanDestCnpj === cleanBranchCnpj) {
      console.log("✅ Classificado como PURCHASE (somos destinatário)");
      return "PURCHASE";
    }
    
    // REGRA 2: Se somos o transportador = CARGO (transporte)
    if (cleanTranspCnpj === cleanBranchCnpj) {
      console.log("✅ Classificado como CARGO (somos transportador)");
      return "CARGO";
    }
    
    // REGRA 3: Se somos o remetente = RETURN (devolução)
    if (cleanEmitCnpj === cleanBranchCnpj) {
      console.log("✅ Classificado como RETURN (somos remetente)");
      return "RETURN";
    }
    
    // REGRA 4: Nenhum dos casos acima = OTHER
    console.log("⚠️  Classificado como OTHER (caso não identificado)");
    return "OTHER";
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao classificar NFe:", message);
    return "OTHER";
  }
}

/**
 * Extrai metadados da carga (para NFes do tipo CARGO)
 */
export function extractCargoInfo(nfeXml: Record<string, unknown>): CargoMetadata | null {
  try {
    // Type cast para estrutura tipada
    const typedNfe = nfeXml as NFeXmlStructure;
    
    // Emitente (cliente que enviou a mercadoria)
    const emitente = typedNfe.emit || {};
    const enderEmit = (typedNfe.enderEmit || {}) as Record<string, unknown>;
    
    // Destinatário (quem vai receber a mercadoria)
    const destinatario = typedNfe.dest || {};
    const enderDest = (typedNfe.enderDest || {}) as Record<string, unknown>;
    
    // Transportador (nós)
    const transportador = typedNfe.transp?.transporta || {};
    
    // Totais
    const total = (typedNfe.total?.ICMSTot || {}) as Record<string, unknown>;
    
    // Volumes
    const vol = (typedNfe.transp?.vol || {}) as Record<string, unknown>;
    const pesoLiquido = parseFloat(String(vol.pesoL || "0"));
    const pesoBruto = parseFloat(String(vol.pesoB || "0"));
    
    // Volume (m³) - se informado
    const volumes = Array.isArray(vol) ? vol : [vol];
    let volumeTotal = 0;
    volumes.forEach((v: Record<string, unknown>) => {
      const qVol = parseInt(String(v.qVol || "0"));
      // Assumir volume padrão se não informado (estimativa)
      volumeTotal += qVol * 0.5; // 0.5m³ por volume (estimativa)
    });
    
    const metadata: CargoMetadata = {
      issuer: {
        cnpj: String(emitente.CNPJ || emitente.CPF || ""),
        name: String(emitente.xNome || ""),
        address: {
          street: String(enderEmit.xLgr || ""),
          number: String(enderEmit.nro || ""),
          city: String(enderEmit.xMun || ""),
          uf: String(enderEmit.UF || ""),
        },
      },
      
      recipient: {
        cnpj: String(destinatario.CNPJ || destinatario.CPF || ""),
        name: String(destinatario.xNome || ""),
        address: {
          street: String(enderDest.xLgr || ""),
          number: String(enderDest.nro || ""),
          city: String(enderDest.xMun || ""),
          uf: String(enderDest.UF || ""),
        },
      },
      
      carrier: {
        cnpj: String(transportador.CNPJ || ""),
        name: String(transportador.xNome || ""),
      },
      
      value: parseFloat(String(total.vNF || "0")),
      weight: pesoBruto || pesoLiquido || 0,
      volume: volumeTotal,
      
      origin: {
        city: String(enderEmit.xMun || ""),
        uf: String(enderEmit.UF || ""),
      },
      
      destination: {
        city: String(enderDest.xMun || ""),
        uf: String(enderDest.UF || ""),
      },
    };
    
    console.log("📦 Metadados da carga extraídos:", {
      issuer: metadata.issuer.name,
      recipient: metadata.recipient.name,
      origin: `${metadata.origin.city}/${metadata.origin.uf}`,
      destination: `${metadata.destination.city}/${metadata.destination.uf}`,
      value: metadata.value,
      weight: metadata.weight,
    });
    
    return metadata;
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao extrair metadados da carga:", message);
    return null;
  }
}

/**
 * Calcula prazo de entrega baseado na distância (estimativa)
 */
export function estimateDeliveryDeadline(
  originUf: string,
  destinationUf: string,
  issueDate: Date
): Date {
  // Estimativa simplificada de prazo por distância
  const deadline = new Date(issueDate);
  
  // Mesma UF: +2 dias
  if (originUf === destinationUf) {
    deadline.setDate(deadline.getDate() + 2);
    return deadline;
  }
  
  // UFs vizinhas (Sul/Sudeste): +3 dias
  const sulSudeste = ["SP", "RJ", "MG", "ES", "PR", "SC", "RS"];
  if (sulSudeste.includes(originUf) && sulSudeste.includes(destinationUf)) {
    deadline.setDate(deadline.getDate() + 3);
    return deadline;
  }
  
  // Nordeste/Norte: +5 dias
  const nordesteNorte = ["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA", "PA", "AM", "AC", "RO", "RR", "AP", "TO"];
  if (nordesteNorte.includes(originUf) && nordesteNorte.includes(destinationUf)) {
    deadline.setDate(deadline.getDate() + 5);
    return deadline;
  }
  
  // Centro-Oeste: +4 dias
  const centroOeste = ["MT", "MS", "GO", "DF"];
  if (centroOeste.includes(originUf) && centroOeste.includes(destinationUf)) {
    deadline.setDate(deadline.getDate() + 4);
    return deadline;
  }
  
  // Longa distância (Norte/Nordeste ↔ Sul/Sudeste): +7 dias
  if (
    (sulSudeste.includes(originUf) && nordesteNorte.includes(destinationUf)) ||
    (nordesteNorte.includes(originUf) && sulSudeste.includes(destinationUf))
  ) {
    deadline.setDate(deadline.getDate() + 7);
    return deadline;
  }
  
  // Padrão: +5 dias
  deadline.setDate(deadline.getDate() + 5);
  return deadline;
}

































