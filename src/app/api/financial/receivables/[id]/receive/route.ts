import { NextRequest, NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import { accountsReceivable, bankAccounts } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull } from "drizzle-orm";

/**
 * POST /api/financial/receivables/[id]/receive
 * 
 * Registra recebimento de uma conta a receber
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();

    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const [receivable] = await db
      .select()
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.id, id),
          eq(accountsReceivable.organizationId, ctx.organizationId),
          isNull(accountsReceivable.deletedAt)
        )
      );

    if (!receivable) {
      return NextResponse.json({ error: "Conta a receber não encontrada" }, { status: 404 });
    }

    const amountReceived = parseFloat(body.amountPaid) || parseFloat(receivable.amount);
    const discount = parseFloat(body.discount) || 0;
    const interest = parseFloat(body.interest) || 0;
    const fine = parseFloat(body.fine) || 0;
    const receiveDate = body.payDate ? new Date(body.payDate) : new Date();

    let status = "RECEIVED";
    if (amountReceived < parseFloat(receivable.amount)) {
      status = "PARTIAL";
    }

    await db
      .update(accountsReceivable)
      .set({
        amountReceived,
        discount,
        interest,
        fine,
        receiveDate,
        status,
        bankAccountId: body.bankAccountId || null,
        notes: body.notes || receivable.notes,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
        version: receivable.version + 1,
      })
      .where(
        and(
          eq(accountsReceivable.id, id),
          eq(accountsReceivable.version, receivable.version)
        )
      );

    // Atualiza saldo da conta bancária
    if (body.bankAccountId) {
      const [bankAccount] = await db
        .select()
        .from(bankAccounts)
        .where(
          and(
            eq(bankAccounts.id, body.bankAccountId),
            eq(bankAccounts.organizationId, ctx.organizationId),
            isNull(bankAccounts.deletedAt)
          )
        );

      if (bankAccount) {
        const newBalance = parseFloat(bankAccount.currentBalance) + amountReceived;
        
        await db
          .update(bankAccounts)
          .set({
            currentBalance: newBalance.toString(),
            updatedBy: ctx.userId,
            updatedAt: new Date(),
            version: bankAccount.version + 1,
          })
          .where(eq(bankAccounts.id, body.bankAccountId));
      }
    }

    const [updated] = await db
      .select()
      .from(accountsReceivable)
      .where(eq(accountsReceivable.id, id));

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao registrar recebimento:", error);
    return NextResponse.json(
      { error: "Falha ao registrar recebimento", details: errorMessage },
      { status: 500 }
    );
  }
}

