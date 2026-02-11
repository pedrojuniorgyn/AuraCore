// ============================================================================
// ⛔ READY FOR REMOVAL - E16.4
// Zero external consumers detected. All functionality migrated to DDD modules.
// Safe to delete after E17 sprint verification.
// ============================================================================

/**
 * @deprecated Este arquivo está deprecated desde 20/01/2026 e será removido em versão futura.
 * A funcionalidade foi migrada para o módulo DDD: `src/modules/fiscal/`
 *
 * @see E7 DDD Migration
 * @since 2026-01-20
 */

import { XMLParser } from "fast-xml-parser";
import zlib from "zlib";
import { parseNFeXML } from "./nfe-parser";
import { parseCTeXML } from "./fiscal/cte-parser";
import { db } from "@/lib/db";
import { 
  fiscalDocuments,
  fiscalDocumentItems,
  businessPartners, 
  products,
  branches,
  inboundInvoices,
  cargoDocuments,
  externalCtes
} from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { 
  classifyNFe,
  getFiscalStatusFromClassification
} from "./fiscal-classification-service";
// extractCargoInfo e estimateDeliveryDeadline foram removidos (não usados) - nfe-classifier.ts deletado em E10.1
import {
  batchGetNCMCategorization
} from "./ncm-categorization-service";

/**
 * 🤖 SEFAZ PROCESSOR SERVICE
 * 
 * Processa o retorno do webservice DistribuicaoDFe:
 * - Descompacta documentos GZip (docZip)
 * - Roteia diferentes tipos (resNFe, procNFe, etc)
 * - Importa NFes automaticamente
 * - Atualiza NSU
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
});

interface ProcessResult {
  totalDocuments: number;
  imported: number;
  duplicates: number;
  errors: number;
  resumos: number; // resNFe (resumos)
  completas: number; // procNFe (completas)
  errorMessages: string[];
  message?: string;
}

/**
 * Processa a resposta XML da Sefaz DistribuicaoDFe
 */
export async function processSefazResponse(
  xmlResponse: string,
  organizationId: number,
  branchId: number,
  userId: string
): Promise<ProcessResult> {
  const result: ProcessResult = {
    totalDocuments: 0,
    imported: 0,
    duplicates: 0,
    errors: 0,
    resumos: 0,
    completas: 0,
    errorMessages: [],
  };

  try {
    console.log("🔍 Parseando resposta da Sefaz...");

    // Parse do XML de resposta
    const responseObj = parser.parse(xmlResponse);

    // Navega até a estrutura do retorno
    const soapBody = responseObj["soap:Envelope"]?.["soap:Body"];
    const nfeDistDFeInteresseResponse = soapBody?.nfeDistDFeInteresseResponse;
    const nfeDistDFeInteresseResult = nfeDistDFeInteresseResponse?.nfeDistDFeInteresseResult;
    const retDistDFeInt = nfeDistDFeInteresseResult?.retDistDFeInt;

    if (!retDistDFeInt) {
      throw new Error("Estrutura de resposta inválida (retDistDFeInt não encontrado)");
    }

    // Verifica status da resposta
    const cStat = retDistDFeInt.cStat;
    const xMotivo = retDistDFeInt.xMotivo;
    const ultNSU = retDistDFeInt.ultNSU;
    const maxNSU = retDistDFeInt.maxNSU;

    console.log(`📊 Status Sefaz: ${cStat} - ${xMotivo}`);
    console.log(`🔢 ultNSU: ${ultNSU}, maxNSU: ${maxNSU}`);

    // Status 138: Documentos localizados
    if (cStat !== "138" && cStat !== 138) {
      console.log(`⚠️  Nenhum documento novo (Status: ${cStat})`);
      console.log(`📋 Retorno completo:`, JSON.stringify(retDistDFeInt, null, 2));
      return result;
    }

    // Extrai documentos
    const loteDistDFeInt = retDistDFeInt.loteDistDFeInt;

    if (!loteDistDFeInt || !loteDistDFeInt.docZip) {
      console.log("⚠️  Nenhum documento no lote");
      return result;
    }

    // Normaliza docZip para array
    const docZipArray = Array.isArray(loteDistDFeInt.docZip)
      ? loteDistDFeInt.docZip
      : [loteDistDFeInt.docZip];

    result.totalDocuments = docZipArray.length;

    console.log(`📦 Total de documentos: ${result.totalDocuments}`);

    // Processa cada documento
    for (const docZip of docZipArray) {
      try {
        const nsu = docZip["@_NSU"];
        const schema = docZip["@_schema"]; // Tipo do documento (resNFe, procNFe, etc)

        console.log(`\n📄 Processando NSU ${nsu} (Tipo: ${schema})...`);

        // Decodifica Base64
        const compressedBuffer = Buffer.from(docZip["#text"], "base64");

        // Descompacta GZIP
        const xmlContent = zlib.gunzipSync(compressedBuffer).toString("utf-8");

        console.log(`✅ XML descompactado (${xmlContent.length} bytes)`);

        // Roteamento por tipo de documento
        if (schema?.startsWith("resNFe")) {
          // RESUMO de NFe - Apenas salva referência (não importa completo)
          result.resumos++;
          console.log("📋 Resumo de NFe detectado (não será importado)");
          // TODO: Salvar em tabela de "NFes Disponíveis para Download Completo"
        } else if (schema?.startsWith("procNFe")) {
          // NFE COMPLETA - Importa automaticamente!
          result.completas++;
          console.log("📥 NFe completa detectada! Importando...");

          const nfeResult = await importNFeAutomatically(xmlContent, organizationId, branchId, userId);
          
          if (nfeResult === "SUCCESS") {
            result.imported++;
            console.log("✅ NFe importada com sucesso!");
          } else if (nfeResult === "DUPLICATE") {
            result.duplicates++;
            console.log("⚠️  NFe duplicada (já existe no sistema)");
          }
        } else if (schema?.startsWith("resEvento")) {
          // EVENTO de NFe (Cancelamento, Manifestação, etc) - Ignorar por enquanto
          console.log("📋 Evento de NFe detectado (será ignorado)");
        } else if (schema?.startsWith("procCTe")) {
          // ✅ OPÇÃO A - BLOCO 4: CTe COMPLETO (emitido externamente - Multicte/bsoft)
          result.completas++;
          console.log("🚚 CTe externo detectado! Importando...");
          
          try {
            const cteResult = await importExternalCTe(xmlContent, organizationId, branchId, userId);
            
            if (cteResult === "SUCCESS") {
              result.imported++;
              console.log("✅ CTe externo importado com sucesso!");
            } else if (cteResult === "DUPLICATE") {
              result.duplicates++;
              console.log("⚠️  CTe duplicado (já existe no sistema)");
            }
          } catch (cteError: unknown) {
            const cteErrorMsg = cteError instanceof Error ? cteError.message : String(cteError);
            console.error(`❌ Erro ao importar CTe:`, cteErrorMsg);
            result.errors++;
            result.errorMessages.push(`CTe: ${cteErrorMsg}`);
          }
        } else {
          console.log(`⚠️  Tipo de documento não suportado: ${schema}`);
        }

      } catch (docError: unknown) {
        const docErrorMsg = docError instanceof Error ? docError.message : String(docError);
        console.error(`❌ Erro ao processar documento:`, docErrorMsg);
        result.errors++;
        result.errorMessages.push(docErrorMsg);
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 RESUMO DA IMPORTAÇÃO:");
    console.log(`  ├─ 📦 Total retornados: ${result.totalDocuments}`);
    console.log(`  ├─ ✅ Importados: ${result.imported}`);
    console.log(`  ├─ ⚠️  Duplicados: ${result.duplicates}`);
    console.log(`  ├─ ❌ Erros: ${result.errors}`);
    console.log(`  ├─ 📋 Resumos: ${result.resumos}`);
    console.log(`  └─ 📄 Completos: ${result.completas}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // ✅ Validação: Se todos são duplicatas, alertar
    if (result.duplicates === result.totalDocuments && result.totalDocuments > 0) {
      console.warn("⚠️  ALERTA: TODOS os documentos retornados são duplicatas!");
      console.warn("⚠️  Isso pode indicar que o NSU não está sendo atualizado corretamente.");
      console.warn("⚠️  Ou os documentos já foram importados anteriormente.");
    }

    return result;

  } catch (error: unknown) {
    console.error("❌ Erro ao processar resposta Sefaz:", error);
    throw error;
  }
}

/**
 * Importa uma NFe automaticamente (chamando a lógica de import existente)
 * @returns "SUCCESS" se importou com sucesso, "DUPLICATE" se já existia
 */
async function importNFeAutomatically(
  xmlContent: string,
  organizationId: number,
  branchId: number,
  userId: string
): Promise<"SUCCESS" | "DUPLICATE"> {
  try {
    // ✅ BUG-003: userId já é string (ADR-0003), não precisa converter
    // createdBy e updatedBy esperam string diretamente
    
    // Parse do XML da NFe
    const parsedNFe = await parseNFeXML(xmlContent);

    // Verifica duplicata na NOVA tabela
    const [existingDoc] = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.organizationId, organizationId),
          eq(fiscalDocuments.accessKey, parsedNFe.accessKey),
          isNull(fiscalDocuments.deletedAt)
        )
      );

    if (existingDoc) {
      console.log(`⚠️  NFe já importada (Chave: ${parsedNFe.accessKey})`);
      return "DUPLICATE";  // ✅ Retorna status ao invés de lançar erro
    }

    // Auto-cadastro de fornecedor (se necessário)
    let partnerId: number | null = null;

    const [existingPartner] = await db
      .select()
      .from(businessPartners)
      .where(
        and(
          eq(businessPartners.organizationId, organizationId),
          eq(businessPartners.document, parsedNFe.issuer.cnpj.replace(/\D/g, "")),
          isNull(businessPartners.deletedAt)
        )
      );

    if (existingPartner) {
      partnerId = existingPartner.id;
    } else {
      // Cria fornecedor
      const partnerData: typeof businessPartners.$inferInsert = {
        organizationId,
        type: "PROVIDER",
        document: parsedNFe.issuer.cnpj.replace(/\D/g, ""),
        name: parsedNFe.issuer.name,
        tradeName: parsedNFe.issuer.tradeName,
        taxRegime: "NORMAL",
        ie: parsedNFe.issuer.ie || "ISENTO",
        indIeDest: "9",
        im: null,
        cClassTrib: null,
        zipCode: parsedNFe.issuer.address.zipCode,
        street: parsedNFe.issuer.address.street,
        number: parsedNFe.issuer.address.number,
        complement: null,
        district: parsedNFe.issuer.address.district,
        cityCode: parsedNFe.issuer.address.cityCode,
        cityName: parsedNFe.issuer.address.cityName,
        state: parsedNFe.issuer.address.state,
        email: null,
        phone: parsedNFe.issuer.phone || null,
        dataSource: "XML_IMPORT",
        status: "ACTIVE",
        createdBy: userId, // ✅ BUG-003: userId já é string
        updatedBy: userId,
        version: 1,
      };
      await db.insert(businessPartners).values(partnerData);

      const [newPartner] = await db
        .select()
        .from(businessPartners)
        .where(
          and(
            eq(businessPartners.organizationId, organizationId),
            eq(businessPartners.document, parsedNFe.issuer.cnpj.replace(/\D/g, ""))
          )
        )
        .orderBy(desc(businessPartners.id));

      partnerId = newPartner?.id || null;
    }

    // ✅ OPÇÃO A - BLOCO 1: CLASSIFICAÇÃO AUTOMÁTICA
    // Buscar CNPJ da filial para classificar a NFe
    const [branch] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, branchId));
    
    if (!branch) {
      throw new Error(`Filial ${branchId} não encontrada`);
    }
    
    // Classificar NFe automaticamente (PURCHASE, CARGO, RETURN, SALE, OTHER)
    const nfeType = classifyNFe(parsedNFe, branch.document);
    const fiscalStatus = getFiscalStatusFromClassification(nfeType);
    
    console.log(`🔍 Classificando NFe:`);
    console.log(`  - Branch CNPJ: ${branch.document}`);
    console.log(`  - Destinatário: ${parsedNFe.recipient.cnpj}`);
    console.log(`  - Emitente: ${parsedNFe.issuer.cnpj}`);
    console.log(`  - Transportador: ${parsedNFe.transporter?.cnpj || 'N/A'}`);
    console.log(`  - Natureza Operação: ${parsedNFe.operation.naturezaOperacao}`);
    console.log(`  - CFOP: ${parsedNFe.operation.cfop}`);
    console.log(`🏷️  NFe classificada como: ${nfeType}`);

    // ✅ Insere na NOVA TABELA fiscal_documents
    const documentData: typeof fiscalDocuments.$inferInsert = {
      organizationId,
      branchId,
      
      // Tipo e Identificação
      documentType: "NFE",
      documentNumber: parsedNFe.number,
      documentSeries: parsedNFe.series,
      accessKey: parsedNFe.accessKey,
      
      // Parceiro
      partnerId,
      partnerDocument: parsedNFe.issuer.cnpj.replace(/\D/g, ""),
      partnerName: parsedNFe.issuer.name,
      
      // Datas
      issueDate: parsedNFe.issueDate,
      entryDate: new Date(),
      
      // Valores
      grossAmount: parsedNFe.totals.products.toString(),
      taxAmount: "0.00", // TODO: calcular impostos totais
      netAmount: parsedNFe.totals.nfe.toString(),
      
      // Classificação Fiscal
      fiscalClassification: nfeType, // PURCHASE, CARGO, RETURN, OTHER
      cfop: parsedNFe.items[0]?.cfop || null,
      operationType: "ENTRADA",
      
      // Status Triple
      fiscalStatus, // CLASSIFIED ou PENDING_CLASSIFICATION (automático)
      accountingStatus: "PENDING",
      financialStatus: "NO_TITLE",
      
      // XML/PDF
      xmlContent: parsedNFe.xmlContent,
      xmlHash: parsedNFe.xmlHash,
      
      // Controle
      editable: true,
      importedFrom: "SEFAZ",
      
      // Auditoria
      createdBy: userId, // ✅ BUG-003: userId já é string
      updatedBy: userId,
      version: 1,
    };
    await db.insert(fiscalDocuments).values(documentData);

    // Busca documento fiscal criado
    const [newDocument] = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.organizationId, organizationId),
          eq(fiscalDocuments.accessKey, parsedNFe.accessKey)
        )
      )
      .orderBy(desc(fiscalDocuments.id));

    if (!newDocument) {
      throw new Error("Falha ao criar registro do documento fiscal");
    }
    
    const fiscalDocumentId = newDocument.id;

    console.log(`📊 Documento fiscal #${fiscalDocumentId} criado - Status: ${newDocument.fiscalStatus}`);

    // 🏷️ Categorizar itens por NCM (em batch)
    const ncmCodes = parsedNFe.items.map(item => item.ncm).filter(Boolean);
    const ncmCategorizationMap = await batchGetNCMCategorization(ncmCodes, organizationId);
    
    console.log(`📦 Categorizando ${parsedNFe.items.length} itens por NCM...`);

    // ✅ Insere os itens na NOVA TABELA fiscal_document_items
    for (const item of parsedNFe.items) {
      // Buscar categorização do NCM
      const categorization = ncmCategorizationMap.get(item.ncm);
      // Tenta vincular produto automaticamente
      let productId: number | null = null;

      const [existingProduct] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.organizationId, organizationId),
            eq(products.sku, item.productCode),
            isNull(products.deletedAt)
          )
        );

      if (existingProduct) {
        productId = existingProduct.id;
      }

      const itemData: typeof fiscalDocumentItems.$inferInsert = {
        fiscalDocumentId,
        organizationId,
        
        // Identificação
        itemNumber: item.itemNumber,
        productId,
        ncmCode: item.ncm,
        
        // Categorização Automática por NCM ✨
        categoryId: categorization?.categoryId || null,
        chartAccountId: categorization?.chartAccountId || null,
        costCenterId: null, // TODO: permitir configuração de centro de custo padrão
        
        // Descrição
        description: item.productName || item.description || "Produto sem descrição",
        
        // Quantidades
        quantity: item.quantity.toString(),
        unit: item.unit,
        unitPrice: item.unitPrice.toString(),
        
        // Valores
        grossAmount: item.totalGross?.toString() || item.totalPrice?.toString() || "0.00",
        discountAmount: item.discount?.toString() || "0.00",
        netAmount: item.totalNet?.toString() || item.totalPrice?.toString() || "0.00",
        
        // Impostos (se disponíveis)
        icmsAmount: item.icms?.value?.toString() || "0.00",
        ipiAmount: item.ipi?.value?.toString() || "0.00",
        pisAmount: item.pis?.value?.toString() || "0.00",
        cofinsAmount: item.cofins?.value?.toString() || "0.00",
        
        // CFOP
        cfop: item.cfop,
      };
      await db.insert(fiscalDocumentItems).values(itemData);
    }

    console.log(`✅ NFe ${parsedNFe.number} importada com ${parsedNFe.items.length} itens`);
    
    return "SUCCESS";  // ✅ Retorna sucesso após importação completa

  } catch (error: unknown) {
    // Se chegou aqui, é erro real (não duplicata)
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Falha ao importar NFe: ${errorMsg}`);
  }
}

/**
 * 🚚 IMPORTA CTe EXTERNO AUTOMATICAMENTE
 * 
 * Chamado quando a SEFAZ retorna um procCTe (CTe emitido por terceiros)
 * @returns "SUCCESS" se importou com sucesso, "DUPLICATE" se já existia
 */
async function importExternalCTe(
  xmlContent: string,
  organizationId: number,
  branchId: number,
  userId: string
): Promise<"SUCCESS" | "DUPLICATE"> {
  try {
    console.log("🚚 Iniciando importação de CTe externo...");

    // Parse do XML do CTe
    const parsedCTe = await parseCTeXML(xmlContent);

    console.log(`📋 CTe ${parsedCTe.cteNumber} - Emitente: ${parsedCTe.issuer.name}`);

    // Verifica duplicata
    const [existingCTe] = await db
      .select()
      .from(externalCtes)
      .where(
        and(
          eq(externalCtes.organizationId, organizationId),
          eq(externalCtes.accessKey, parsedCTe.accessKey),
          isNull(externalCtes.deletedAt)
        )
      );

    if (existingCTe) {
      console.log(`⚠️  CTe já importado (Chave: ${parsedCTe.accessKey})`);
      return "DUPLICATE";  // ✅ Retorna status ao invés de lançar erro
    }

    // Busca cargo_document pela NFe vinculada (se houver)
    let cargoDocumentId: number | null = null;
    let linkedNfeKey: string | null = null;

    if (parsedCTe.linkedNfeKeys.length > 0) {
      linkedNfeKey = parsedCTe.linkedNfeKeys[0]; // Usa a primeira NFe

      console.log(`🔗 CTe vinculado à NFe: ${linkedNfeKey}`);

      // Busca a NFe no sistema
      const [nfeInvoice] = await db
        .select()
        .from(inboundInvoices)
        .where(
          and(
            eq(inboundInvoices.organizationId, organizationId),
            eq(inboundInvoices.accessKey, linkedNfeKey),
            isNull(inboundInvoices.deletedAt)
          )
        );

      if (nfeInvoice) {
        console.log(`✅ NFe encontrada no sistema (ID: ${nfeInvoice.id})`);

        // Busca o cargo_document vinculado à NFe
        const [cargo] = await db
          .select()
          .from(cargoDocuments)
          .where(
            and(
              eq(cargoDocuments.organizationId, organizationId),
              eq(cargoDocuments.nfeInvoiceId, nfeInvoice.id),
              isNull(cargoDocuments.deletedAt)
            )
          );

        if (cargo) {
          cargoDocumentId = cargo.id;
          console.log(`✅ Cargo encontrado (ID: ${cargoDocumentId})`);

          // Atualiza cargo para marcar que tem CTe externo
          await db
            .update(cargoDocuments)
            .set({
              hasExternalCte: "S",
              updatedBy: userId,
              updatedAt: new Date(),
            })
            .where(eq(cargoDocuments.id, cargoDocumentId));

          console.log(`✅ Cargo atualizado: hasExternalCte = 'S'`);
        } else {
          console.log(`⚠️  Cargo não encontrado para esta NFe`);
        }
      } else {
        console.log(`⚠️  NFe ${linkedNfeKey} não encontrada no sistema`);
      }
    }

    // Insere o CTe externo
    await db.insert(externalCtes).values({
      organizationId,
      branchId,
      accessKey: parsedCTe.accessKey,
      cteNumber: parsedCTe.cteNumber,
      series: parsedCTe.series,
      model: parsedCTe.model,
      issueDate: parsedCTe.issueDate,

      // Emitente (Transportadora externa)
      issuerCnpj: parsedCTe.issuer.cnpj,
      issuerName: parsedCTe.issuer.name,
      issuerIe: parsedCTe.issuer.ie || null,

      // Remetente
      senderCnpj: parsedCTe.sender.cnpj,
      senderName: parsedCTe.sender.name,

      // Destinatário
      recipientCnpj: parsedCTe.recipient.cnpj,
      recipientName: parsedCTe.recipient.name,

      // Expedidor (opcional)
      shipperCnpj: parsedCTe.shipper?.cnpj || null,
      shipperName: parsedCTe.shipper?.name || null,

      // Recebedor (opcional)
      receiverCnpj: parsedCTe.receiver?.cnpj || null,
      receiverName: parsedCTe.receiver?.name || null,

      // Origem e Destino
      originCity: parsedCTe.origin.city,
      originUf: parsedCTe.origin.uf,
      destinationCity: parsedCTe.destination.city,
      destinationUf: parsedCTe.destination.uf,

      // Valores
      totalValue: parsedCTe.values.total.toString(),
      cargoValue: parsedCTe.values.cargo.toString(),
      icmsValue: parsedCTe.values.icms?.toString() || null,

      // Carga
      weight: parsedCTe.cargo.weight?.toString() || null,
      volume: parsedCTe.cargo.volume?.toString() || null,

      // Vinculação
      linkedNfeKey,
      cargoDocumentId,

      // XML
      xmlContent: parsedCTe.xmlContent,
      xmlHash: parsedCTe.xmlHash,

      // Status
      status: cargoDocumentId ? "LINKED" : "IMPORTED",
      importSource: "SEFAZ_AUTO",

      createdBy: userId,
      updatedBy: userId,
      version: 1,
    });

    console.log(`✅ CTe externo ${parsedCTe.cteNumber} importado com sucesso!`);
    
    if (cargoDocumentId) {
      console.log(`🔗 CTe vinculado ao cargo_document (ID: ${cargoDocumentId})`);
    }

    return "SUCCESS";  // ✅ Retorna sucesso após importação completa

  } catch (error: unknown) {
    // Se chegou aqui, é erro real (não duplicata)
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Falha ao importar CTe externo: ${errorMsg}`);
  }
}



