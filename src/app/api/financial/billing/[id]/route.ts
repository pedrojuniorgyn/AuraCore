import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { billingInvoices } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar fatura específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const billingId = parseInt(resolvedParams.id);
    if (isNaN(billingId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const billing = await db
      .select()
      .from(billingInvoices)
      .where(
        and(
          eq(billingInvoices.id, billingId),
          eq(billingInvoices.organizationId, session.user.organizationId),
          isNull(billingInvoices.deletedAt)
        )
      )
      .limit(1);

    if (billing.length === 0) {
      return NextResponse.json(
        { error: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: billing[0] });
  } catch (error) {
    console.error("Erro ao buscar fatura:", error);
    return NextResponse.json(
      { error: "Erro ao buscar fatura" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar fatura
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const billingId = parseInt(resolvedParams.id);
    if (isNaN(billingId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.customerId || !body.dueDate) {
      return NextResponse.json(
        { error: "Cliente e data de vencimento são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se fatura existe
    const existing = await db
      .select()
      .from(billingInvoices)
      .where(
        and(
          eq(billingInvoices.id, billingId),
          eq(billingInvoices.organizationId, session.user.organizationId),
          isNull(billingInvoices.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    // Validar se já foi finalizada
    if (existing[0].status === "FINALIZED" || existing[0].status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível editar fatura finalizada ou paga" },
        { status: 400 }
      );
    }

    // Validar mudança de valor se tiver boleto gerado
    if (existing[0].boletoId && body.totalAmount !== existing[0].totalAmount) {
      return NextResponse.json(
        { error: "Não é possível alterar valor de fatura com boleto gerado" },
        { status: 400 }
      );
    }

    // Atualizar
    const updated = await db
      .update(billingInvoices)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(billingInvoices.id, billingId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Fatura atualizada com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar fatura:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar fatura" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da fatura
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const billingId = parseInt(resolvedParams.id);
    if (isNaN(billingId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se fatura existe
    const existing = await db
      .select()
      .from(billingInvoices)
      .where(
        and(
          eq(billingInvoices.id, billingId),
          eq(billingInvoices.organizationId, session.user.organizationId),
          isNull(billingInvoices.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing[0].status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível excluir fatura já paga" },
        { status: 400 }
      );
    }

    if (existing[0].status === "FINALIZED") {
      return NextResponse.json(
        { error: "Não é possível excluir fatura finalizada. Cancele-a primeiro." },
        { status: 400 }
      );
    }

    if (existing[0].boletoId) {
      return NextResponse.json(
        { error: "Não é possível excluir fatura com boleto gerado. Cancele o boleto primeiro." },
        { status: 400 }
      );
    }

    // TODO: Excluir CTes vinculados ou desvincular
    // await unlinkCtes(billingId);

    // Soft delete
    await db
      .update(billingInvoices)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
      })
      .where(eq(billingInvoices.id, billingId));

    return NextResponse.json({
      success: true,
      message: "Fatura excluída com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir fatura:", error);
    return NextResponse.json(
      { error: "Erro ao excluir fatura" },
      { status: 500 }
    );
  }
}





