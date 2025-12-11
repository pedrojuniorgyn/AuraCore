import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accountsPayable } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar conta a pagar específica
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
          eq(accountsPayable.organizationId, session.user.organizationId),
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
  } catch (error) {
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
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

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
          eq(accountsPayable.organizationId, session.user.organizationId),
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
    const updated = await db
      .update(accountsPayable)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(accountsPayable.id, payableId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Conta a pagar atualizada com sucesso",
      data: updated[0],
    });
  } catch (error) {
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
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

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
          eq(accountsPayable.organizationId, session.user.organizationId),
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
        deletedBy: session.user.id,
      })
      .where(eq(accountsPayable.id, payableId));

    return NextResponse.json({
      success: true,
      message: "Conta a pagar excluída com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir conta a pagar:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conta a pagar" },
      { status: 500 }
    );
  }
}


