import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountsPayable } from "@/lib/db/schema";
import { financialTransactions, journalEntries, journalEntryLines } from "@/lib/db/schema/accounting";
import { auth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

/**
 * 💰 POST /api/financial/payables/:id/pay
 * 
 * Baixa de conta a pagar com juros, multa, IOF, tarifas
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    const organizationId = session.user.organizationId;
    const userId = parseInt(session.user.id);
    const branchId = parseInt(request.headers.get("x-branch-id") || "1");
    const payableId = parseInt(resolvedParams.id);
    
    const body = await request.json();
    const {
      paymentDate,
      paymentMethod,
      bankAccountId,
      interestAmount = 0,
      fineAmount = 0,
      discountAmount = 0,
      iofAmount = 0,
      bankFeeAmount = 0,
      otherFeesAmount = 0,
      notes,
      documentNumber,
      autoPost = true, // Gerar lançamento contábil automaticamente
    } = body;
    
    // Buscar conta a pagar
    const [payable] = await db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.id, payableId),
          eq(accountsPayable.organizationId, organizationId),
          isNull(accountsPayable.deletedAt)
        )
      );
    
    if (!payable) {
      return NextResponse.json({ error: "Conta a pagar não encontrada" }, { status: 404 });
    }
    
    if (payable.status === "PAID") {
      return NextResponse.json({ error: "Conta já paga" }, { status: 400 });
    }
    
    const originalAmount = parseFloat(payable.amount as any);
    const netAmount = originalAmount + interestAmount + fineAmount - discountAmount + iofAmount + bankFeeAmount + otherFeesAmount;
    
    // Criar transação financeira
    await db.insert(financialTransactions).values({
      organizationId,
      branchId,
      transactionType: "PAYMENT",
      payableId,
      transactionDate: new Date(paymentDate),
      paymentMethod,
      bankAccountId: bankAccountId || null,
      originalAmount: originalAmount.toString(),
      interestAmount: interestAmount.toString(),
      fineAmount: fineAmount.toString(),
      discountAmount: discountAmount.toString(),
      iofAmount: iofAmount.toString(),
      bankFeeAmount: bankFeeAmount.toString(),
      otherFeesAmount: otherFeesAmount.toString(),
      netAmount: netAmount.toString(),
      notes,
      documentNumber,
      createdBy: userId,
      updatedBy: userId,
    });
    
    // Atualizar conta a pagar
    await db
      .update(accountsPayable)
      .set({
        status: "PAID",
        paidAt: new Date(paymentDate),
        updatedAt: new Date(),
      })
      .where(eq(accountsPayable.id, payableId));
    
    // Se autoPost, gerar lançamento contábil da baixa
    if (autoPost) {
      const entryNumber = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-PAY-${payableId}`;
      
      await db.insert(journalEntries).values({
        organizationId,
        branchId,
        entryNumber,
        entryDate: new Date(paymentDate),
        sourceType: "PAYMENT",
        sourceId: payableId,
        description: `Pagamento - ${payable.description || "Sem descrição"}`,
        totalDebit: netAmount.toString(),
        totalCredit: netAmount.toString(),
        status: "POSTED",
        postedAt: new Date(),
        postedBy: userId,
        createdBy: userId,
        updatedBy: userId,
      });
      
      const [newEntry] = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.entryNumber, entryNumber));
      
      // Linhas do lançamento
      let lineNum = 1;
      
      // DÉBITO: Fornecedor (baixa do passivo)
      await db.insert(journalEntryLines).values({
        journalEntryId: newEntry.id,
        organizationId,
        lineNumber: lineNum++,
        chartAccountId: 100, // Fornecedor - TODO: configurável
        debitAmount: originalAmount.toString(),
        creditAmount: "0",
        description: "Fornecedor - Baixa de pagamento",
        partnerId: payable.partnerId,
      });
      
      // DÉBITO: Juros (se houver)
      if (interestAmount > 0) {
        await db.insert(journalEntryLines).values({
          journalEntryId: newEntry.id,
          organizationId,
          lineNumber: lineNum++,
          chartAccountId: 300, // Juros Passivos - TODO: configurável
          debitAmount: interestAmount.toString(),
          creditAmount: "0",
          description: "Juros de Atraso",
        });
      }
      
      // DÉBITO: Multa (se houver)
      if (fineAmount > 0) {
        await db.insert(journalEntryLines).values({
          journalEntryId: newEntry.id,
          organizationId,
          lineNumber: lineNum++,
          chartAccountId: 301, // Multas Passivas - TODO: configurável
          debitAmount: fineAmount.toString(),
          creditAmount: "0",
          description: "Multa por Atraso",
        });
      }
      
      // DÉBITO: IOF (se houver)
      if (iofAmount > 0) {
        await db.insert(journalEntryLines).values({
          journalEntryId: newEntry.id,
          organizationId,
          lineNumber: lineNum++,
          chartAccountId: 302, // IOF - TODO: configurável
          debitAmount: iofAmount.toString(),
          creditAmount: "0",
          description: "IOF",
        });
      }
      
      // DÉBITO: Tarifas Bancárias (se houver)
      if (bankFeeAmount > 0) {
        await db.insert(journalEntryLines).values({
          journalEntryId: newEntry.id,
          organizationId,
          lineNumber: lineNum++,
          chartAccountId: 303, // Tarifas Bancárias - TODO: configurável
          debitAmount: bankFeeAmount.toString(),
          creditAmount: "0",
          description: "Tarifa Bancária",
        });
      }
      
      // CRÉDITO: Banco (saída de caixa)
      await db.insert(journalEntryLines).values({
        journalEntryId: newEntry.id,
        organizationId,
        lineNumber: lineNum++,
        chartAccountId: 10, // Banco - TODO: configurável
        debitAmount: "0",
        creditAmount: netAmount.toString(),
        description: `Pagamento via ${paymentMethod}`,
      });
      
      // CRÉDITO: Descontos (se houver)
      if (discountAmount > 0) {
        await db.insert(journalEntryLines).values({
          journalEntryId: newEntry.id,
          organizationId,
          lineNumber: lineNum++,
          chartAccountId: 400, // Descontos Obtidos - TODO: configurável
          debitAmount: "0",
          creditAmount: discountAmount.toString(),
          description: "Desconto Obtido",
        });
      }
      
      // Atualizar FK
      await db
        .update(accountsPayable)
        .set({ journalEntryId: newEntry.id })
        .where(eq(accountsPayable.id, payableId));
    }
    
    return NextResponse.json({
      success: true,
      message: "Pagamento registrado com sucesso",
      payment: {
        originalAmount,
        interestAmount,
        fineAmount,
        discountAmount,
        iofAmount,
        bankFeeAmount,
        netAmount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
