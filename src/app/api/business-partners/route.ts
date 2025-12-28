import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businessPartners } from "@/lib/db/schema";
import { createBusinessPartnerSchema } from "@/lib/validators/business-partner";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, ilike, or, desc } from "drizzle-orm";

/**
 * GET /api/business-partners
 * Lista todos os parceiros de negócio da organização do usuário logado.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Filtra por organization_id
 * - ✅ Soft Delete: Apenas parceiros não deletados
 * 
 * Query Params:
 * - search: Busca por nome/documento
 * - type: Filtra por tipo (CLIENT/PROVIDER/CARRIER)
 * - status: Filtra por status
 */
export async function GET(request: NextRequest) {
  try {
    // 🔗 Garante conexão com banco antes de continuar
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    // 🔐 SEGURANÇA: Obtém contexto do tenant
    const ctx = await getTenantContext();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";

    // Construir condições dinamicamente
    const conditions = [
      eq(businessPartners.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO MULTI-TENANT
      isNull(businessPartners.deletedAt) // 🗑️ APENAS NÃO DELETADOS
    ];

    // Filtro por busca (nome, trade_name, document)
    if (search) {
      const searchCondition = or(
        ilike(businessPartners.name, `%${search}%`),
        ilike(businessPartners.tradeName, `%${search}%`),
        ilike(businessPartners.document, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Filtro por tipo
    if (type) {
      conditions.push(eq(businessPartners.type, type));
    }

    // Filtro por status
    if (status) {
      conditions.push(eq(businessPartners.status, status));
    }

    const partnersList = await db
      .select()
      .from(businessPartners)
      .where(and(...conditions.filter(Boolean)));

    return NextResponse.json({
      data: partnersList,
      total: partnersList.length,
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    // Se for erro de autenticação, retorna a resposta de erro direto
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error fetching business partners:", error);
    return NextResponse.json(
      { error: "Falha ao buscar parceiros de negócio.", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/business-partners
 * Cria um novo parceiro de negócio.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Injeta organization_id automaticamente
 * - ✅ Auditoria: Registra created_by/updated_by
 * - ✅ Validação: Zod schema
 * - ✅ Uniqueness: Valida documento único dentro da organização
 */
export async function POST(request: NextRequest) {
  try {
    // 🔗 Garante conexão com banco antes de continuar
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    // 🔐 SEGURANÇA: Obtém contexto do tenant
    const ctx = await getTenantContext();

    const body = await request.json();
    
    // Validação Zod
    const parsedBody = createBusinessPartnerSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { 
          error: "Dados inválidos", 
          errors: parsedBody.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { document, ...data } = parsedBody.data;

    // Verifica se documento já existe nesta organização (e não está deletado)
    const [existingPartner] = await db
      .select()
      .from(businessPartners)
      .where(
        and(
          eq(businessPartners.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO
          eq(businessPartners.document, document),
          isNull(businessPartners.deletedAt) // Ignora deletados
        )
      );

    if (existingPartner) {
      return NextResponse.json(
        { error: "Documento (CPF/CNPJ) já cadastrado para esta organização." },
        { status: 409 }
      );
    }

    // Cria o parceiro com Enterprise Base Pattern
    await db.insert(businessPartners).values({
      ...data,
      document,
      organizationId: ctx.organizationId, // 🔐 INJETA ORGANIZATION_ID (não confia no front)
      createdBy: ctx.userId, // 📊 AUDITORIA: Quem criou
      updatedBy: ctx.userId, // 📊 AUDITORIA: Quem criou (igual)
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      version: 1, // 🔒 OPTIMISTIC LOCK: Versão inicial
      status: data.status || "ACTIVE",
    });

    // SQL Server não suporta RETURNING, então buscamos o registro recém-criado
    const [newPartner] = await db
      .select()
      .from(businessPartners)
      .where(
        and(
          eq(businessPartners.organizationId, ctx.organizationId),
          eq(businessPartners.document, document)
        )
      )
      .orderBy(desc(businessPartners.id));

    return NextResponse.json(newPartner, { status: 201 });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error creating business partner:", error);
    return NextResponse.json(
      { error: "Falha ao criar parceiro de negócio.", details: errorMessage },
      { status: 500 }
    );
  }
}
