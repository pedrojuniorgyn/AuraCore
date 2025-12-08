import { XMLParser } from "fast-xml-parser";
import zlib from "zlib";
import { parseNFeXML } from "./nfe-parser";
import { db } from "@/lib/db";
import { inboundInvoices, inboundInvoiceItems, businessPartners, products } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

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
    let docZipArray = Array.isArray(loteDistDFeInt.docZip)
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

          await importNFeAutomatically(xmlContent, organizationId, branchId, userId);
          result.imported++;
          console.log("✅ NFe importada com sucesso!");
        } else if (schema?.startsWith("resEvento")) {
          // EVENTO de NFe (Cancelamento, Manifestação, etc) - Ignorar por enquanto
          console.log("📋 Evento de NFe detectado (será ignorado)");
        } else {
          console.log(`⚠️  Tipo de documento não suportado: ${schema}`);
        }

      } catch (docError: any) {
        console.error(`❌ Erro ao processar documento:`, docError.message);
        result.errors++;
        result.errorMessages.push(docError.message);
      }
    }

    console.log("\n✅ Processamento concluído!");

    return result;

  } catch (error: any) {
    console.error("❌ Erro ao processar resposta Sefaz:", error);
    throw error;
  }
}

/**
 * Importa uma NFe automaticamente (chamando a lógica de import existente)
 */
async function importNFeAutomatically(
  xmlContent: string,
  organizationId: number,
  branchId: number,
  userId: string
): Promise<void> {
  try {
    // Parse do XML da NFe
    const parsedNFe = await parseNFeXML(xmlContent);

    // Verifica duplicata
    const [existingInvoice] = await db
      .select()
      .from(inboundInvoices)
      .where(
        and(
          eq(inboundInvoices.organizationId, organizationId),
          eq(inboundInvoices.accessKey, parsedNFe.accessKey),
          isNull(inboundInvoices.deletedAt)
        )
      );

    if (existingInvoice) {
      console.log(`⚠️  NFe já importada (Chave: ${parsedNFe.accessKey})`);
      throw new Error("DUPLICATE_INVOICE");
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
      await db.insert(businessPartners).values({
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
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      });

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

    // Insere a NFe
    await db.insert(inboundInvoices).values({
      organizationId,
      branchId,
      partnerId,
      accessKey: parsedNFe.accessKey,
      series: parsedNFe.series,
      number: parsedNFe.number,
      model: parsedNFe.model,
      issueDate: parsedNFe.issueDate,
      totalProducts: parsedNFe.totals.products.toString(),
      totalNfe: parsedNFe.totals.nfe.toString(),
      xmlContent: parsedNFe.xmlContent,
      xmlHash: parsedNFe.xmlHash,
      status: "IMPORTED",
      importedBy: "SEFAZ_ROBOT", // 🤖 Marcado como importação automática
      createdBy: userId,
      updatedBy: userId,
      version: 1,
    });

    // Busca NFe criada
    const [newInvoice] = await db
      .select()
      .from(inboundInvoices)
      .where(
        and(
          eq(inboundInvoices.organizationId, organizationId),
          eq(inboundInvoices.accessKey, parsedNFe.accessKey)
        )
      )
      .orderBy(desc(inboundInvoices.id));

    if (!newInvoice) {
      throw new Error("Falha ao criar registro da NFe");
    }

    // Insere os itens
    for (const item of parsedNFe.items) {
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

      await db.insert(inboundInvoiceItems).values({
        invoiceId: newInvoice.id,
        productId,
        productCodeXml: item.productCode,
        productNameXml: item.productName,
        eanXml: item.ean,
        ncm: item.ncm,
        cfop: item.cfop,
        cst: item.cst,
        quantity: item.quantity.toString(),
        unit: item.unit,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
        itemNumber: item.itemNumber,
      });
    }

    console.log(`✅ NFe ${parsedNFe.number} importada com ${parsedNFe.items.length} itens`);

  } catch (error: any) {
    if (error.message === "DUPLICATE_INVOICE") {
      throw error; // Propaga para contador de duplicatas
    }
    throw new Error(`Falha ao importar NFe: ${error.message}`);
  }
}



