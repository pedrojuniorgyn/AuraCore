/**
 * ✅ OPÇÃO A - BLOCO 4: CTe PROCESSOR
 * 
 * Processa CTes importados da Sefaz (externos - Multicte/bsoft)
 * Identifica CTes emitidos por terceiros usando o certificado da empresa
 */

import { db } from "@/lib/db";
import { cteHeader, cteCargoDocuments, cargoDocuments, inboundInvoices } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export interface ParsedCTe {
  // Identificação
  cteKey: string;
  cteNumber: string;
  serie: string;
  issueDate: Date;
  
  // Partes
  senderId: number | null;
  recipientId: number | null;
  takerId: number | null;
  
  // Valores
  serviceValue: number;
  cargoValue: number;
  totalValue: number;
  
  // ICMS
  icmsBase: number;
  icmsRate: number;
  icmsValue: number;
  
  // Origem/Destino
  originUf: string;
  destinationUf: string;
  
  // Documentos de carga (NFes)
  cargoDocumentKeys: string[];
  
  // Emissor externo
  externalEmitter?: string;
  
  // XML
  xmlContent: string;
}

/**
 * Importa um CTe externo no sistema
 */
export async function importExternalCTe(
  parsedCTe: ParsedCTe,
  organizationId: number,
  branchId: number,
  userId: string
): Promise<number> {
  try {
    console.log(`📄 Importando CTe externo: ${parsedCTe.cteKey}`);
    
    // 1. Verificar se CTe já existe
    const [existing] = await db
      .select()
      .from(cteHeader)
      .where(
        and(
          eq(cteHeader.cteKey, parsedCTe.cteKey),
          eq(cteHeader.organizationId, organizationId),
          isNull(cteHeader.deletedAt)
        )
      );
    
    if (existing) {
      console.log(`⚠️  CTe ${parsedCTe.cteKey} já importado, atualizando...`);
      
      // Atualizar se necessário
      await db
        .update(cteHeader)
        .set({
          status: "AUTHORIZED",
          xmlAuthorized: parsedCTe.xmlContent,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(cteHeader.id, existing.id));
      
      return existing.id;
    }
    
    // 2. Inserir CTe como EXTERNO
    const [newCte] = await db
      .insert(cteHeader)
      .values({
        organizationId,
        branchId,
        
        // Identificação
        cteNumber: parseInt(parsedCTe.cteNumber),
        serie: parsedCTe.serie,
        model: "57",
        cteKey: parsedCTe.cteKey,
        
        // Datas
        issueDate: parsedCTe.issueDate,
        
        // Partes
        senderId: parsedCTe.senderId,
        recipientId: parsedCTe.recipientId,
        takerId: parsedCTe.takerId || parsedCTe.senderId,
        
        // Origem/Destino
        originUf: parsedCTe.originUf,
        destinationUf: parsedCTe.destinationUf,
        
        // Valores
        serviceValue: parsedCTe.serviceValue.toString(),
        cargoValue: parsedCTe.cargoValue.toString(),
        totalValue: parsedCTe.totalValue.toString(),
        receivableValue: parsedCTe.totalValue.toString(),
        
        // ICMS
        icmsBase: parsedCTe.icmsBase.toString(),
        icmsRate: parsedCTe.icmsRate.toString(),
        icmsValue: parsedCTe.icmsValue.toString(),
        
        // Seguro (obrigatório - usar padrão)
        insurancePolicy: "IMPORTADO",
        insuranceCertificate: "IMPORTADO",
        
        // Modal
        modal: "01",
        
        // Status
        status: "AUTHORIZED",
        
        // XML
        xmlAuthorized: parsedCTe.xmlContent,
        
        // ✅ OPÇÃO A - BLOCO 4: Origem Externa
        cteOrigin: "EXTERNAL",
        externalEmitter: parsedCTe.externalEmitter || "Sistema Externo (Multicte/bsoft)",
        importedAt: new Date(),
        
        // Auditoria
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      })
      .returning();
    
    const cteId = newCte.id;
    
    console.log(`✅ CTe externo ${parsedCTe.cteKey} importado com ID ${cteId}`);
    
    // 3. Vincular documentos de carga (NFes)
    for (const nfeKey of parsedCTe.cargoDocumentKeys) {
      // Buscar NFe no sistema
      const [nfe] = await db
        .select()
        .from(inboundInvoices)
        .where(
          and(
            eq(inboundInvoices.accessKey, nfeKey),
            eq(inboundInvoices.organizationId, organizationId),
            isNull(inboundInvoices.deletedAt)
          )
        );
      
      // Buscar cargo correspondente
      let cargoId = null;
      if (nfe) {
        const [cargo] = await db
          .select()
          .from(cargoDocuments)
          .where(
            and(
              eq(cargoDocuments.nfeInvoiceId, nfe.id),
              isNull(cargoDocuments.deletedAt)
            )
          );
        
        if (cargo) {
          cargoId = cargo.id;
          
          // Atualizar cargo para indicar que tem CTe externo
          await db
            .update(cargoDocuments)
            .set({
              hasExternalCte: "S",
              cteId,
              status: "IN_TRANSIT",
              updatedAt: new Date(),
            })
            .where(eq(cargoDocuments.id, cargo.id));
        }
      }
      
      // Inserir vínculo
      await db.insert(cteCargoDocuments).values({
        cteHeaderId: cteId,
        documentType: "NFE",
        documentKey: nfeKey,
        
        // ✅ OPÇÃO A - BLOCO 3: Rastreabilidade
        sourceInvoiceId: nfe?.id || null,
        sourceCargoId: cargoId,
        
        createdAt: new Date(),
      });
      
      console.log(`  ↳ NFe ${nfeKey} vinculada ao CTe`);
    }
    
    return cteId;
    
  } catch (error: any) {
    console.error(`❌ Erro ao importar CTe externo:`, error.message);
    throw error;
  }
}

/**
 * Parse de XML do CTe (simplificado)
 */
export async function parseCTeXML(xmlContent: string): Promise<ParsedCTe> {
  // TODO: Implementar parser completo de CTe
  // Por enquanto, retorna estrutura básica
  
  throw new Error("Parser de CTe ainda não implementado completamente");
}










