import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountsPayable } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";

// GET - Buscar conta a pagar específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const ctx = await getTenantContext();

    const payableId = parseInt(resolvedParams.id);
    if (isNaN(payableId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const payable = await db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.id, payableId),
          eq(accountsPayable.organizationId, ctx.organizationId),
          isNull(accountsPayable.deletedAt)
        )
      )
      .limit(1);

    if (payable.length === 0) {
      return NextResponse.json(
        { error: "Conta a pagar não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: payable[0] });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao buscar conta a pagar:", error);
    return NextResponse.json(
      { error: "Erro ao buscar conta a pagar" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar conta a pagar
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const ctx = await getTenantContext();

    const payableId = parseInt(resolvedParams.id);
    if (isNaN(payableId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.supplierId || !body.dueDate || !body.amount) {
      return NextResponse.json(
        { error: "Fornecedor, vencimento e valor são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se conta existe
    const existing = await db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.id, payableId),
          eq(accountsPayable.organizationId, ctx.organizationId),
          isNull(accountsPayable.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Conta a pagar não encontrada" },
        { status: 404 }
      );
    }

    // Validar se já foi paga
    if (existing[0].status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível editar conta já paga" },
        { status: 400 }
      );
    }

    // Validar mudança de valor se estiver em remessa
    if (existing[0].remittanceId && body.amount !== existing[0].amount) {
      return NextResponse.json(
        { error: "Não é possível alterar valor de conta incluída em remessa" },
        { status: 400 }
      );
    }

    // Atualizar
    await db
      .update(accountsPayable)
      .set({
        ...body,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(accountsPayable.id, payableId), eq(accountsPayable.organizationId, ctx.organizationId)));

    const [updated] = await db
      .select()
      .from(accountsPayable)
      .where(and(eq(accountsPayable.id, payableId), eq(accountsPayable.organizationId, ctx.organizationId)))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: "Conta a pagar atualizada com sucesso",
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao atualizar conta a pagar:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar conta a pagar" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da conta a pagar
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const ctx = await getTenantContext();

    const payableId = parseInt(resolvedParams.id);
    if (isNaN(payableId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se conta existe
    const existing = await db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.id, payableId),
          eq(accountsPayable.organizationId, ctx.organizationId),
          isNull(accountsPayable.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Conta a pagar não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing[0].status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível excluir conta já paga" },
        { status: 400 }
      );
    }

    if (existing[0].remittanceId) {
      return NextResponse.json(
        { error: "Não é possível excluir conta incluída em remessa" },
        { status: 400 }
      );
    }

    // TODO: Reverter lançamento contábil se houver
    // if (existing[0].journalEntryId) {
    //   await reverseJournalEntry(existing[0].journalEntryId);
    // }

    // Soft delete
    await db
      .update(accountsPayable)
      .set({
        deletedAt: new Date(),
        deletedBy: ctx.userId,
      })
      .where(and(eq(accountsPayable.id, payableId), eq(accountsPayable.organizationId, ctx.organizationId)));

    return NextResponse.json({
      success: true,
      message: "Conta a pagar excluída com sucesso",
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao excluir conta a pagar:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conta a pagar" },
      { status: 500 }
    );
  }
}









