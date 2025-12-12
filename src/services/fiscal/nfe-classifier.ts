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
 * Classifica uma NFe baseado em quem é o destinatário e quem é o transportador
 */
export function classifyNFe(nfeXml: any, branchCnpj: string): NFeType {
  try {
    // Normalizar CNPJ da filial (remover formatação)
    const cleanBranchCnpj = branchCnpj.replace(/[^\d]/g, "");
    
    // Extrair CNPJs do XML
    const destCnpj = nfeXml.dest?.CNPJ || nfeXml.dest?.CPF || "";
    const emitCnpj = nfeXml.emit?.CNPJ || nfeXml.emit?.CPF || "";
    const transpCnpj = nfeXml.transp?.transporta?.CNPJ || "";
    
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
    
  } catch (error: any) {
    console.error("❌ Erro ao classificar NFe:", error.message);
    return "OTHER";
  }
}

/**
 * Extrai metadados da carga (para NFes do tipo CARGO)
 */
export function extractCargoInfo(nfeXml: any): CargoMetadata | null {
  try {
    // Emitente (cliente que enviou a mercadoria)
    const emitente = nfeXml.emit || {};
    const enderEmit = emitente.enderEmit || {};
    
    // Destinatário (quem vai receber a mercadoria)
    const destinatario = nfeXml.dest || {};
    const enderDest = destinatario.enderDest || {};
    
    // Transportador (nós)
    const transportador = nfeXml.transp?.transporta || {};
    
    // Totais
    const total = nfeXml.total?.ICMSTot || {};
    
    // Volumes
    const vol = nfeXml.transp?.vol || {};
    const pesoLiquido = parseFloat(vol.pesoL || "0");
    const pesoBruto = parseFloat(vol.pesoB || "0");
    
    // Volume (m³) - se informado
    const volumes = Array.isArray(vol) ? vol : [vol];
    let volumeTotal = 0;
    volumes.forEach((v: any) => {
      const qVol = parseInt(v.qVol || "0");
      // Assumir volume padrão se não informado (estimativa)
      volumeTotal += qVol * 0.5; // 0.5m³ por volume (estimativa)
    });
    
    const metadata: CargoMetadata = {
      issuer: {
        cnpj: (emitente.CNPJ || emitente.CPF || "").toString(),
        name: emitente.xNome || "",
        address: {
          street: enderEmit.xLgr || "",
          number: enderEmit.nro || "",
          city: enderEmit.xMun || "",
          uf: enderEmit.UF || "",
        },
      },
      
      recipient: {
        cnpj: (destinatario.CNPJ || destinatario.CPF || "").toString(),
        name: destinatario.xNome || "",
        address: {
          street: enderDest.xLgr || "",
          number: enderDest.nro || "",
          city: enderDest.xMun || "",
          uf: enderDest.UF || "",
        },
      },
      
      carrier: {
        cnpj: (transportador.CNPJ || "").toString(),
        name: transportador.xNome || "",
      },
      
      value: parseFloat(total.vNF || "0"),
      weight: pesoBruto || pesoLiquido || 0,
      volume: volumeTotal,
      
      origin: {
        city: enderEmit.xMun || "",
        uf: enderEmit.UF || "",
      },
      
      destination: {
        city: enderDest.xMun || "",
        uf: enderDest.UF || "",
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
    
  } catch (error: any) {
    console.error("❌ Erro ao extrair metadados da carga:", error.message);
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















