import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { queryFirst } from "@/lib/db/query-helpers";
import { crmLeads } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const leadId = parseInt(resolvedParams.id);
    const body = await request.json();

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Evitar override de campos sensíveis via spread
    const {
      id: _id,
      organizationId: _orgId,
      createdBy: _createdBy,
      createdAt: _createdAt,
      deletedAt: _deletedAt,
      deletedBy: _deletedBy,
      updatedAt: _updatedAt,
      updatedBy: _updatedBy,
      version: _version,
      wonDate: wonDateRaw,
      ...safeBody
    } = (body ?? {}) as Record<string, unknown>;

    // wonDate só deve ser alterado se vier explicitamente no payload
    const hasWonDate = Object.prototype.hasOwnProperty.call(body ?? {}, "wonDate");

    const updateResult = await db
      .update(crmLeads)
      .set({
        ...safeBody,
        ...(hasWonDate
          ? { wonDate: wonDateRaw ? new Date(wonDateRaw as any) : null }
          : {}),
      })
      .where(
        and(
          eq(crmLeads.id, leadId),
          eq(crmLeads.organizationId, ctx.organizationId)
        )
      )
      ;

    const rowsAffectedRaw = (updateResult as any)?.rowsAffected;
    const rowsAffected = Array.isArray(rowsAffectedRaw)
      ? Number(rowsAffectedRaw[0] ?? 0)
      : Number(rowsAffectedRaw ?? 0);
    if (!rowsAffected) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const lead = await queryFirst<typeof crmLeads.$inferSelect>(db
      .select()
      .from(crmLeads)
      .where(and(eq(crmLeads.id, leadId), eq(crmLeads.organizationId, ctx.organizationId)))
    );

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: lead });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE - Soft delete do lead
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const leadId = parseInt(resolvedParams.id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se lead existe
    const [existing] = await db
      .select()
      .from(crmLeads)
      .where(
        and(
          eq(crmLeads.id, leadId),
          eq(crmLeads.organizationId, ctx.organizationId)
        )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    // Validar se lead foi convertido (ganho)
    if (existing.status === "WON") {
      return NextResponse.json(
        { error: "Não é possível excluir lead convertido (ganho)" },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(crmLeads)
      .set({
        deletedAt: new Date(),
      })
      .where(and(eq(crmLeads.id, leadId), eq(crmLeads.organizationId, ctx.organizationId)));

    return NextResponse.json({
      success: true,
      message: "Lead excluído com sucesso",
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao excluir lead:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}












