import { NextRequest, NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import { accountsPayable, bankAccounts } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull } from "drizzle-orm";

/**
 * POST /api/financial/payables/[id]/pay
 * 
 * Registra baixa (pagamento) de uma conta a pagar
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

    // Busca a conta a pagar
    const [payable] = await db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.id, id),
          eq(accountsPayable.organizationId, ctx.organizationId),
          isNull(accountsPayable.deletedAt)
        )
      );

    if (!payable) {
      return NextResponse.json({ error: "Conta a pagar não encontrada" }, { status: 404 });
    }

    // Valida valores
    const amountPaid = parseFloat(body.amountPaid) || parseFloat(payable.amount);
    const discount = parseFloat(body.discount) || 0;
    const interest = parseFloat(body.interest) || 0;
    const fine = parseFloat(body.fine) || 0;
    const payDate = body.payDate ? new Date(body.payDate) : new Date();

    // Determina status
    let status = "PAID";
    if (amountPaid < parseFloat(payable.amount)) {
      status = "PARTIAL";
    }

    // Atualiza conta a pagar
    await db
      .update(accountsPayable)
      .set({
        amountPaid,
        discount,
        interest,
        fine,
        payDate,
        status,
        bankAccountId: body.bankAccountId || null,
        notes: body.notes || payable.notes,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
        version: payable.version + 1,
      })
      .where(
        and(
          eq(accountsPayable.id, id),
          eq(accountsPayable.version, payable.version) // Optimistic Lock
        )
      );

    // Atualiza saldo da conta bancária (se informada)
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
        const newBalance = parseFloat(bankAccount.currentBalance) - amountPaid;
        
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

    // Busca registro atualizado
    const [updated] = await db
      .select()
      .from(accountsPayable)
      .where(eq(accountsPayable.id, id));

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao registrar pagamento:", error);
    return NextResponse.json(
      { error: "Falha ao registrar pagamento", details: error.message },
      { status: 500 }
    );
  }
}


