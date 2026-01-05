/**
 * Fiscal Document Import Adapter
 * 
 * Implementa a importação de documentos fiscais (NFe/CTe) para o banco de dados.
 * Encapsula toda a lógica de persistência que estava no sefaz-processor legado.
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 2/9 - sefaz-processor.ts → FiscalDocumentImportAdapter
 */

import { db } from "@/lib/db";
import {
  fiscalDocuments,
  fiscalDocumentItems,
  businessPartners,
  products,
  branches,
  inboundInvoices,
  cargoDocuments,
  externalCtes,
} from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { Result } from "@/shared/domain";
import { FiscalDocumentError } from "@/modules/fiscal/domain/errors/FiscalDocumentError";
import type { DocumentImporter } from "@/modules/fiscal/domain/services/SefazDocumentProcessor";
import { parseNFeXML } from "@/services/nfe-parser";
import { parseCTeXML } from "@/services/fiscal/cte-parser";
import { classifyNFe, getFiscalStatusFromClassification } from "@/services/fiscal-classification-service";
import { batchGetNCMCategorization } from "@/services/ncm-categorization-service";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADAPTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class FiscalDocumentImportAdapter implements DocumentImporter {
  constructor(
    private readonly organizationId: number,
    private readonly branchId: number,
    private readonly userId: string
  ) {}

  /**
   * Importa uma NFe automaticamente
   */
  async importNFe(xmlContent: string): Promise<Result<"SUCCESS" | "DUPLICATE", FiscalDocumentError>> {
    try {
      // Converter userId para number (bigint no banco)
      const userIdNum = parseInt(this.userId, 10);
      if (isNaN(userIdNum)) {
        return Result.fail(new FiscalDocumentError(`UserId inválido: ${this.userId}`));
      }

      // Parse do XML da NFe
      const parsedNFe = await parseNFeXML(xmlContent);

      // Verifica duplicata na tabela fiscal_documents
      const [existingDoc] = await db
        .select()
        .from(fiscalDocuments)
        .where(
          and(
            eq(fiscalDocuments.organizationId, this.organizationId),
            eq(fiscalDocuments.accessKey, parsedNFe.accessKey),
            isNull(fiscalDocuments.deletedAt)
          )
        );

      if (existingDoc) {
        console.log(`⚠️  NFe já importada (Chave: ${parsedNFe.accessKey})`);
        return Result.ok("DUPLICATE");
      }

      // Auto-cadastro de fornecedor (se necessário)
      const partnerIdResult = await this.ensurePartner(parsedNFe.issuer, userIdNum);

      if (Result.isFail(partnerIdResult)) {
        return Result.fail(partnerIdResult.error);
      }

      const partnerId = partnerIdResult.value;

      // Buscar CNPJ da filial para classificar a NFe
      const [branch] = await db.select().from(branches).where(eq(branches.id, this.branchId));

      if (!branch) {
        return Result.fail(new FiscalDocumentError(`Filial ${this.branchId} não encontrada`));
      }

      // Classificar NFe automaticamente (PURCHASE, CARGO, RETURN, SALE, OTHER)
      const nfeType = classifyNFe(parsedNFe, branch.document);
      const fiscalStatus = getFiscalStatusFromClassification(nfeType);

      console.log(`🔍 Classificando NFe:`);
      console.log(`  - Branch CNPJ: ${branch.document}`);
      console.log(`  - Destinatário: ${parsedNFe.recipient.cnpj}`);
      console.log(`  - Emitente: ${parsedNFe.issuer.cnpj}`);
      console.log(`  - Transportador: ${parsedNFe.transporter?.cnpj || "N/A"}`);
      console.log(`  - Natureza Operação: ${parsedNFe.operation.naturezaOperacao}`);
      console.log(`  - CFOP: ${parsedNFe.operation.cfop}`);
      console.log(`🏷️  NFe classificada como: ${nfeType}`);

      // Insere na tabela fiscal_documents
      const documentData: typeof fiscalDocuments.$inferInsert = {
        organizationId: this.organizationId,
        branchId: this.branchId,

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
        fiscalClassification: nfeType,
        cfop: parsedNFe.items[0]?.cfop || null,
        operationType: "ENTRADA",

        // Status Triple
        fiscalStatus,
        accountingStatus: "PENDING",
        financialStatus: "NO_TITLE",

        // XML/PDF
        xmlContent: parsedNFe.xmlContent,
        xmlHash: parsedNFe.xmlHash,

        // Controle
        editable: true,
        importedFrom: "SEFAZ",

        // Auditoria
        createdBy: String(userIdNum),
        updatedBy: String(userIdNum),
        version: 1,
      };

      await db.insert(fiscalDocuments).values(documentData);

      // Busca documento fiscal criado
      const [newDocument] = await db
        .select()
        .from(fiscalDocuments)
        .where(
          and(
            eq(fiscalDocuments.organizationId, this.organizationId),
            eq(fiscalDocuments.accessKey, parsedNFe.accessKey)
          )
        )
        .orderBy(desc(fiscalDocuments.id));

      if (!newDocument) {
        return Result.fail(new FiscalDocumentError("Falha ao criar registro do documento fiscal"));
      }

      const fiscalDocumentId = newDocument.id;

      console.log(`📊 Documento fiscal #${fiscalDocumentId} criado - Status: ${newDocument.fiscalStatus}`);

      // Categorizar itens por NCM (em batch)
      const ncmCodes = parsedNFe.items.map((item) => item.ncm).filter(Boolean);
      const ncmCategorizationMap = await batchGetNCMCategorization(ncmCodes, this.organizationId);

      console.log(`📦 Categorizando ${parsedNFe.items.length} itens por NCM...`);

      // Insere os itens na tabela fiscal_document_items
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
              eq(products.organizationId, this.organizationId),
              eq(products.sku, item.productCode),
              isNull(products.deletedAt)
            )
          );

        if (existingProduct) {
          productId = existingProduct.id;
        }

        const itemData: typeof fiscalDocumentItems.$inferInsert = {
          fiscalDocumentId,
          organizationId: this.organizationId,

          // Identificação
          itemNumber: item.itemNumber,
          productId,
          ncmCode: item.ncm,

          // Categorização Automática por NCM
          categoryId: categorization?.categoryId || null,
          chartAccountId: categorization?.chartAccountId || null,
          costCenterId: null,

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

      return Result.ok("SUCCESS");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new FiscalDocumentError(`Falha ao importar NFe: ${errorMessage}`));
    }
  }

  /**
   * Importa um CTe externo automaticamente
   */
  async importCTe(xmlContent: string): Promise<Result<"SUCCESS" | "DUPLICATE", FiscalDocumentError>> {
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
            eq(externalCtes.organizationId, this.organizationId),
            eq(externalCtes.accessKey, parsedCTe.accessKey),
            isNull(externalCtes.deletedAt)
          )
        );

      if (existingCTe) {
        console.log(`⚠️  CTe já importado (Chave: ${parsedCTe.accessKey})`);
        return Result.ok("DUPLICATE");
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
              eq(inboundInvoices.organizationId, this.organizationId),
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
                eq(cargoDocuments.organizationId, this.organizationId),
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
                updatedBy: this.userId,
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
        organizationId: this.organizationId,
        branchId: this.branchId,
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

        createdBy: this.userId,
        updatedBy: this.userId,
        version: 1,
      });

      console.log(`✅ CTe externo ${parsedCTe.cteNumber} importado com sucesso!`);

      if (cargoDocumentId) {
        console.log(`🔗 CTe vinculado ao cargo_document (ID: ${cargoDocumentId})`);
      }

      return Result.ok("SUCCESS");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new FiscalDocumentError(`Falha ao importar CTe externo: ${errorMessage}`));
    }
  }

  /**
   * Garante que o parceiro (fornecedor) existe, criando se necessário
   */
  private async ensurePartner(
    issuer: {
      cnpj: string;
      name: string;
      tradeName?: string;
      ie?: string;
      phone?: string;
      address: {
        zipCode: string;
        street: string;
        number: string;
        district: string;
        cityCode: string;
        cityName: string;
        state: string;
      };
    },
    userIdNum: number
  ): Promise<Result<number, FiscalDocumentError>> {
    try {
      const [existingPartner] = await db
        .select()
        .from(businessPartners)
        .where(
          and(
            eq(businessPartners.organizationId, this.organizationId),
            eq(businessPartners.document, issuer.cnpj.replace(/\D/g, "")),
            isNull(businessPartners.deletedAt)
          )
        );

      if (existingPartner) {
        return Result.ok(existingPartner.id);
      }

      // Cria fornecedor
      const partnerData: typeof businessPartners.$inferInsert = {
        organizationId: this.organizationId,
        type: "PROVIDER",
        document: issuer.cnpj.replace(/\D/g, ""),
        name: issuer.name,
        tradeName: issuer.tradeName,
        taxRegime: "NORMAL",
        ie: issuer.ie || "ISENTO",
        indIeDest: "9",
        im: null,
        cClassTrib: null,
        zipCode: issuer.address.zipCode,
        street: issuer.address.street,
        number: issuer.address.number,
        complement: null,
        district: issuer.address.district,
        cityCode: issuer.address.cityCode,
        cityName: issuer.address.cityName,
        state: issuer.address.state,
        email: null,
        phone: issuer.phone || null,
        dataSource: "XML_IMPORT",
        status: "ACTIVE",
        createdBy: String(userIdNum),
        updatedBy: String(userIdNum),
        version: 1,
      };

      await db.insert(businessPartners).values(partnerData);

      const [newPartner] = await db
        .select()
        .from(businessPartners)
        .where(
          and(
            eq(businessPartners.organizationId, this.organizationId),
            eq(businessPartners.document, issuer.cnpj.replace(/\D/g, ""))
          )
        )
        .orderBy(desc(businessPartners.id));

      if (!newPartner) {
        return Result.fail(new FiscalDocumentError("Falha ao criar fornecedor"));
      }

      return Result.ok(newPartner.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new FiscalDocumentError(`Falha ao garantir parceiro: ${errorMessage}`));
    }
  }
}

/**
 * Factory para criar adapter
 */
export function createFiscalDocumentImportAdapter(
  organizationId: number,
  branchId: number,
  userId: string
): FiscalDocumentImportAdapter {
  return new FiscalDocumentImportAdapter(organizationId, branchId, userId);
}

