import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crmLeads } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const ctx = await getTenantContext();
    const leadId = parseInt(resolvedParams.id);
    const body = await request.json();

    const [lead] = await db
      .update(crmLeads)
      .set({
        stage: body.stage,
        status: body.status,
        score: body.score,
        estimatedValue: body.estimatedValue,
        probability: body.probability,
        wonDate: body.wonDate ? new Date(body.wonDate) : null,
        lostReason: body.lostReason,
      })
      .where(
        and(
          eq(crmLeads.id, leadId),
          eq(crmLeads.organizationId, ctx.organizationId)
        )
      )
      .returning();

    return NextResponse.json({ success: true, data: lead });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Soft delete do lead
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const ctx = await getTenantContext();
    const leadId = parseInt(resolvedParams.id);

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
        deletedBy: ctx.userId,
      })
      .where(eq(crmLeads.id, leadId));

    return NextResponse.json({
      success: true,
      message: "Lead excluído com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao excluir lead:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




