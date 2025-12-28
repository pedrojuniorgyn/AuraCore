import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountsReceivable } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { queryFirst } from "@/lib/db/query-helpers";

// GET - Buscar conta a receber específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const ctx = await getTenantContext();

    const receivableId = parseInt(resolvedParams.id);
    if (isNaN(receivableId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const receivable = await queryFirst<typeof accountsReceivable.$inferSelect>(db
      .select()
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.id, receivableId),
          eq(accountsReceivable.organizationId, ctx.organizationId),
          isNull(accountsReceivable.deletedAt)
        )
      )
      );

    if (!receivable) {
      return NextResponse.json(
        { error: "Conta a receber não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: receivable });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao buscar conta a receber:", error);
    return NextResponse.json(
      { error: "Erro ao buscar conta a receber" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar conta a receber
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const ctx = await getTenantContext();

    const receivableId = parseInt(resolvedParams.id);
    if (isNaN(receivableId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.customerId || !body.dueDate || !body.amount) {
      return NextResponse.json(
        { error: "Cliente, vencimento e valor são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se conta existe
    const existing = await queryFirst<typeof accountsReceivable.$inferSelect>(db
      .select()
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.id, receivableId),
          eq(accountsReceivable.organizationId, ctx.organizationId),
          isNull(accountsReceivable.deletedAt)
        )
      )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Conta a receber não encontrada" },
        { status: 404 }
      );
    }

    // Validar se já foi recebida
    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível editar conta já recebida" },
        { status: 400 }
      );
    }

    // Validar mudança de valor se tiver boleto gerado
    if (existing.boletoId && body.amount !== existing.amount) {
      return NextResponse.json(
        { error: "Não é possível alterar valor de conta com boleto gerado" },
        { status: 400 }
      );
    }

    // Atualizar
    await db
      .update(accountsReceivable)
      .set({
        ...body,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(accountsReceivable.id, receivableId), eq(accountsReceivable.organizationId, ctx.organizationId)));

    const updated = await queryFirst<typeof accountsReceivable.$inferSelect>(db
      .select()
      .from(accountsReceivable)
      .where(and(eq(accountsReceivable.id, receivableId), eq(accountsReceivable.organizationId, ctx.organizationId)))
      );

    return NextResponse.json({
      success: true,
      message: "Conta a receber atualizada com sucesso",
      data: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao atualizar conta a receber:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar conta a receber" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da conta a receber
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const ctx = await getTenantContext();

    const receivableId = parseInt(resolvedParams.id);
    if (isNaN(receivableId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se conta existe
    const existing = await queryFirst<typeof accountsReceivable.$inferSelect>(db
      .select()
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.id, receivableId),
          eq(accountsReceivable.organizationId, ctx.organizationId),
          isNull(accountsReceivable.deletedAt)
        )
      )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Conta a receber não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível excluir conta já recebida" },
        { status: 400 }
      );
    }

    if (existing.boletoId) {
      return NextResponse.json(
        { error: "Não é possível excluir conta com boleto gerado. Cancele o boleto primeiro." },
        { status: 400 }
      );
    }

    // TODO: Reverter lançamento contábil se houver
    // if (existing.journalEntryId) {
    //   await reverseJournalEntry(existing.journalEntryId);
    // }

    // Soft delete
    await db
      .update(accountsReceivable)
      .set({
        deletedAt: new Date(),
      })
      .where(and(eq(accountsReceivable.id, receivableId), eq(accountsReceivable.organizationId, ctx.organizationId)));

    return NextResponse.json({
      success: true,
      message: "Conta a receber excluída com sucesso",
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao excluir conta a receber:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conta a receber" },
      { status: 500 }
    );
  }
}









