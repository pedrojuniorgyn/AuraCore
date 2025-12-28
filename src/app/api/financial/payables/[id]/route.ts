import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountsPayable } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { queryFirst } from "@/lib/db/query-helpers";

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

    const payable = await queryFirst<typeof accountsPayable.$inferSelect>(db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.id, payableId),
          eq(accountsPayable.organizationId, ctx.organizationId),
          isNull(accountsPayable.deletedAt)
        )
      )
      );

    if (!payable) {
      return NextResponse.json(
        { error: "Conta a pagar não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: payable });
  } catch (error: unknown) {
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
    const existing = await queryFirst<typeof accountsPayable.$inferSelect>(db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.id, payableId),
          eq(accountsPayable.organizationId, ctx.organizationId),
          isNull(accountsPayable.deletedAt)
        )
      )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Conta a pagar não encontrada" },
        { status: 404 }
      );
    }

    // Validar se já foi paga
    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível editar conta já paga" },
        { status: 400 }
      );
    }

    // TODO: Validar mudança de valor se estiver em remessa
    // Propriedade remittanceId não existe mais no schema atual
    // if (existing.remittanceId && body.amount !== existing.amount) {
    //   return NextResponse.json(
    //     { error: "Não é possível alterar valor de conta incluída em remessa" },
    //     { status: 400 }
    //   );
    // }

    // Atualizar
    await db
      .update(accountsPayable)
      .set({
        ...body,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(accountsPayable.id, payableId), eq(accountsPayable.organizationId, ctx.organizationId)));

    const updated = await queryFirst<typeof accountsPayable.$inferSelect>(db
      .select()
      .from(accountsPayable)
      .where(and(eq(accountsPayable.id, payableId), eq(accountsPayable.organizationId, ctx.organizationId)))
      );

    return NextResponse.json({
      success: true,
      message: "Conta a pagar atualizada com sucesso",
      data: updated,
    });
  } catch (error: unknown) {
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
    const existing = await queryFirst<typeof accountsPayable.$inferSelect>(db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.id, payableId),
          eq(accountsPayable.organizationId, ctx.organizationId),
          isNull(accountsPayable.deletedAt)
        )
      )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Conta a pagar não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível excluir conta já paga" },
        { status: 400 }
      );
    }

    // TODO: Validar exclusão se estiver em remessa
    // Propriedade remittanceId não existe mais no schema atual
    // if (existing.remittanceId) {
    //   return NextResponse.json(
    //     { error: "Não é possível excluir conta incluída em remessa" },
    //     { status: 400 }
    //   );
    // }

    // TODO: Reverter lançamento contábil se houver
    // if (existing.journalEntryId) {
    //   await reverseJournalEntry(existing.journalEntryId);
    // }

    // Soft delete
    await db
      .update(accountsPayable)
      .set({
        deletedAt: new Date(),
      })
      .where(and(eq(accountsPayable.id, payableId), eq(accountsPayable.organizationId, ctx.organizationId)));

    return NextResponse.json({
      success: true,
      message: "Conta a pagar excluída com sucesso",
    });
  } catch (error: unknown) {
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









