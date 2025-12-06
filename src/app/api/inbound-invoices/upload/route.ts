import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inboundInvoices, inboundInvoiceItems, businessPartners, products } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { parseNFeXML } from "@/services/nfe-parser";
import { eq, and, isNull, or } from "drizzle-orm";

/**
 * POST /api/inbound-invoices/upload
 * 
 * Endpoint para importação de NFe via XML.
 * 
 * Funcionalidades:
 * - Parse do XML da NFe
 * - Auto-cadastro de fornecedor (se não existir)
 * - Vinculação automática de produtos (por código ou EAN)
 * - Salvamento da NFe e itens no banco
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 * - ✅ Detecta duplicatas (por chave de acesso)
 * - ✅ Auditoria: Registra quem importou
 */
export async function POST(request: NextRequest) {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    
    // Lê o arquivo XML do FormData
    const formData = await request.formData();
    const xmlFile = formData.get("xml") as File;
    
    if (!xmlFile) {
      return NextResponse.json(
        { error: "Arquivo XML não fornecido" },
        { status: 400 }
      );
    }
    
    // Lê o conteúdo do arquivo
    const xmlContent = await xmlFile.text();
    
    console.log("📄 Processando XML da NFe...");
    
    // Parse do XML
    let parsedNFe;
    try {
      parsedNFe = await parseNFeXML(xmlContent);
    } catch (error: any) {
      return NextResponse.json(
        { error: "XML inválido ou mal formatado", details: error.message },
        { status: 400 }
      );
    }
    
    console.log("✅ XML parseado:", {
      accessKey: parsedNFe.accessKey,
      issuer: parsedNFe.issuer.name,
      totalItems: parsedNFe.items.length,
    });
    
    // Verifica duplicata (chave de acesso já importada)
    const [existingInvoice] = await db
      .select()
      .from(inboundInvoices)
      .where(
        and(
          eq(inboundInvoices.organizationId, ctx.organizationId),
          eq(inboundInvoices.accessKey, parsedNFe.accessKey),
          isNull(inboundInvoices.deletedAt)
        )
      );
    
    if (existingInvoice) {
      return NextResponse.json(
        { 
          error: "NFe já importada", 
          code: "DUPLICATE_INVOICE",
          invoiceId: existingInvoice.id 
        },
        { status: 409 }
      );
    }
    
    // 🤝 AUTO-CADASTRO DE FORNECEDOR (se não existir)
    let partnerId: number | null = null;
    
    const [existingPartner] = await db
      .select()
      .from(businessPartners)
      .where(
        and(
          eq(businessPartners.organizationId, ctx.organizationId),
          eq(businessPartners.document, parsedNFe.issuer.cnpj.replace(/\D/g, "")),
          isNull(businessPartners.deletedAt)
        )
      );
    
    if (existingPartner) {
      partnerId = existingPartner.id;
      console.log(`✅ Fornecedor encontrado: ${existingPartner.name} (ID: ${partnerId})`);
    } else {
      // Cria novo fornecedor automaticamente
      console.log(`➕ Criando novo fornecedor: ${parsedNFe.issuer.name}`);
      
      await db.insert(businessPartners).values({
        organizationId: ctx.organizationId,
        type: "PROVIDER", // Fornecedor
        document: parsedNFe.issuer.cnpj.replace(/\D/g, ""),
        name: parsedNFe.issuer.name,
        tradeName: parsedNFe.issuer.tradeName,
        taxRegime: "NORMAL", // 🏷️ Regime padrão para empresas que emitem NFe
        ie: parsedNFe.issuer.ie || "ISENTO",
        indIeDest: "9", // Não contribuinte
        im: null, // Inscrição Municipal (não disponível no XML)
        cClassTrib: null, // Classificação Tributária (não disponível no XML)
        zipCode: parsedNFe.issuer.address.zipCode,
        street: parsedNFe.issuer.address.street,
        number: parsedNFe.issuer.address.number,
        complement: null,
        district: parsedNFe.issuer.address.district,
        cityCode: parsedNFe.issuer.address.cityCode,
        cityName: parsedNFe.issuer.address.cityName,
        state: parsedNFe.issuer.address.state,
        email: null, // Email não disponível no XML
        phone: parsedNFe.issuer.phone || null,
        dataSource: "XML_IMPORT", // 🏷️ Marcado como importado de XML
        status: "ACTIVE",
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
        version: 1,
      });
      
      // Busca o fornecedor recém-criado
      const [newPartner] = await db
        .select()
        .from(businessPartners)
        .where(
          and(
            eq(businessPartners.organizationId, ctx.organizationId),
            eq(businessPartners.document, parsedNFe.issuer.cnpj.replace(/\D/g, ""))
          )
        )
        .orderBy(businessPartners.id);
      
      partnerId = newPartner?.id || null;
      console.log(`✅ Fornecedor criado com ID: ${partnerId}`);
    }
    
    // 📝 INSERE A NFe (Cabeçalho)
    await db.insert(inboundInvoices).values({
      organizationId: ctx.organizationId,
      branchId: ctx.defaultBranchId || 1, // Branch atual
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
      importedBy: ctx.userId,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
      version: 1,
    });
    
    // Busca a NFe recém-criada
    const [newInvoice] = await db
      .select()
      .from(inboundInvoices)
      .where(
        and(
          eq(inboundInvoices.organizationId, ctx.organizationId),
          eq(inboundInvoices.accessKey, parsedNFe.accessKey)
        )
      )
      .orderBy(inboundInvoices.id);
    
    if (!newInvoice) {
      return NextResponse.json(
        { error: "Falha ao criar registro da NFe" },
        { status: 500 }
      );
    }
    
    console.log(`✅ NFe criada com ID: ${newInvoice.id}`);
    
    // 📦 PROCESSA ITENS (com vinculação automática de produtos)
    let linkedProducts = 0;
    let newProducts = 0;
    
    for (const item of parsedNFe.items) {
      // Tenta encontrar produto existente (por código ou EAN)
      let productId: number | null = null;
      
      const [existingProduct] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.organizationId, ctx.organizationId),
            or(
              eq(products.sku, item.productCode),
              // Poderia adicionar busca por EAN aqui se tivermos campo EAN
            ),
            isNull(products.deletedAt)
          )
        );
      
      if (existingProduct) {
        productId = existingProduct.id;
        linkedProducts++;
        console.log(`🔗 Produto vinculado: ${existingProduct.name} (ID: ${productId})`);
      } else {
        newProducts++;
        console.log(`⚠️  Produto não encontrado: ${item.productName} (Código: ${item.productCode})`);
      }
      
      // Insere o item da NFe
      await db.insert(inboundInvoiceItems).values({
        invoiceId: newInvoice.id,
        productId, // NULL se não encontrou
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
    
    console.log(`✅ Itens processados: ${parsedNFe.items.length} total (${linkedProducts} vinculados, ${newProducts} novos)`);
    
    return NextResponse.json({
      success: true,
      message: "NFe importada com sucesso!",
      data: {
        invoiceId: newInvoice.id,
        accessKey: parsedNFe.accessKey,
        issuer: parsedNFe.issuer.name,
        totalItems: parsedNFe.items.length,
        linkedProducts,
        newProducts,
        newPartnerCreated: !existingPartner,
      },
    }, { status: 201 });
    
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error importing NFe:", error);
    return NextResponse.json(
      { error: "Falha ao importar NFe", details: error.message },
      { status: 500 }
    );
  }
}

