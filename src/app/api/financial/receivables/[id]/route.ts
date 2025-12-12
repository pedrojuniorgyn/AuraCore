import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accountsReceivable } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar conta a receber específica
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

    const receivableId = parseInt(resolvedParams.id);
    if (isNaN(receivableId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const receivable = await db
      .select()
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.id, receivableId),
          eq(accountsReceivable.organizationId, session.user.organizationId),
          isNull(accountsReceivable.deletedAt)
        )
      )
      .limit(1);

    if (receivable.length === 0) {
      return NextResponse.json(
        { error: "Conta a receber não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: receivable[0] });
  } catch (error) {
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
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

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
    const existing = await db
      .select()
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.id, receivableId),
          eq(accountsReceivable.organizationId, session.user.organizationId),
          isNull(accountsReceivable.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Conta a receber não encontrada" },
        { status: 404 }
      );
    }

    // Validar se já foi recebida
    if (existing[0].status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível editar conta já recebida" },
        { status: 400 }
      );
    }

    // Validar mudança de valor se tiver boleto gerado
    if (existing[0].boletoId && body.amount !== existing[0].amount) {
      return NextResponse.json(
        { error: "Não é possível alterar valor de conta com boleto gerado" },
        { status: 400 }
      );
    }

    // Atualizar
    const updated = await db
      .update(accountsReceivable)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(accountsReceivable.id, receivableId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Conta a receber atualizada com sucesso",
      data: updated[0],
    });
  } catch (error) {
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
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const receivableId = parseInt(resolvedParams.id);
    if (isNaN(receivableId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se conta existe
    const existing = await db
      .select()
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.id, receivableId),
          eq(accountsReceivable.organizationId, session.user.organizationId),
          isNull(accountsReceivable.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Conta a receber não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing[0].status === "PAID") {
      return NextResponse.json(
        { error: "Não é possível excluir conta já recebida" },
        { status: 400 }
      );
    }

    if (existing[0].boletoId) {
      return NextResponse.json(
        { error: "Não é possível excluir conta com boleto gerado. Cancele o boleto primeiro." },
        { status: 400 }
      );
    }

    // TODO: Reverter lançamento contábil se houver
    // if (existing[0].journalEntryId) {
    //   await reverseJournalEntry(existing[0].journalEntryId);
    // }

    // Soft delete
    await db
      .update(accountsReceivable)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
      })
      .where(eq(accountsReceivable.id, receivableId));

    return NextResponse.json({
      success: true,
      message: "Conta a receber excluída com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir conta a receber:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conta a receber" },
      { status: 500 }
    );
  }
}








