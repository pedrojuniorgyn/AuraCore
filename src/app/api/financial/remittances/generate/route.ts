/**
 * API: Gerar Remessa CNAB 240
 * POST /api/financial/remittances/generate
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankAccounts, accountsPayable, bankRemittances, branches } from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { generateCNAB240, type CNAB240Options } from "@/services/banking/cnab-generator";
import { format } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankAccountId, payableIds } = body;

    // === VALIDAÇÃO ===
    if (!bankAccountId || !Array.isArray(payableIds) || payableIds.length === 0) {
      return NextResponse.json(
        { error: "Informe a conta bancária e os títulos a pagar" },
        { status: 400 }
      );
    }

    // === BUSCAR CONTA BANCÁRIA ===
    const [bankAccount] = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, bankAccountId),
          isNull(bankAccounts.deletedAt)
        )
      );

    if (!bankAccount) {
      return NextResponse.json(
        { error: "Conta bancária não encontrada" },
        { status: 404 }
      );
    }

    // === BUSCAR DADOS DA FILIAL (EMPRESA) ===
    const [branch] = await db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.organizationId, bankAccount.organizationId),
          isNull(branches.deletedAt)
        )
      )
      .limit(1);

    if (!branch) {
      return NextResponse.json(
        { error: "Filial não encontrada" },
        { status: 404 }
      );
    }

    // === BUSCAR TÍTULOS A PAGAR ===
    const payables = await db
      .select({
        payable: accountsPayable,
      })
      .from(accountsPayable)
      .where(
        and(
          inArray(accountsPayable.id, payableIds),
          eq(accountsPayable.organizationId, bankAccount.organizationId),
          eq(accountsPayable.status, "OPEN"),
          isNull(accountsPayable.deletedAt)
        )
      );

    if (payables.length === 0) {
      return NextResponse.json(
        { error: "Nenhum título em aberto encontrado" },
        { status: 400 }
      );
    }

    // === PREPARAR DADOS PARA CNAB ===
    const cnabOptions: CNAB240Options = {
      bankAccount: {
        bankCode: bankAccount.bankCode || "208",
        bankName: bankAccount.bankName || "BTG Pactual",
        agency: bankAccount.agency || "0001",
        accountNumber: bankAccount.accountNumber || "0000000001",
        accountDigit: bankAccount.accountDigit || "0",
        wallet: bankAccount.wallet || "09",
        agreementNumber: bankAccount.agreementNumber || "",
        remittanceNumber: bankAccount.nextRemittanceNumber || 1,
      },
      company: {
        document: branch.document.replace(/\D/g, ""),
        name: branch.name,
      },
      titles: payables.map((p) => ({
        id: p.payable.id,
        partnerId: p.payable.partnerId || 0,
        partnerDocument: "00000000000000", // TODO: Buscar do partner
        partnerName: "FORNECEDOR", // TODO: Buscar do partner
        amount: Number(p.payable.amount),
        dueDate: new Date(p.payable.dueDate),
        documentNumber: p.payable.documentNumber || `DOC${p.payable.id}`,
        barCode: undefined, // TODO: Implementar se houver boleto
      })),
      type: "PAYMENT",
    };

    // === GERAR CNAB ===
    const cnabContent = generateCNAB240(cnabOptions);

    // === SALVAR REMESSA ===
    const fileName = `REM_${format(new Date(), "yyyyMMdd")}_${String(
      bankAccount.nextRemittanceNumber
    ).padStart(3, "0")}.rem`;

    const totalAmount = payables.reduce(
      (sum, p) => sum + Number(p.payable.amount),
      0
    );

    const [remittance] = await db
      .insert(bankRemittances)
      .values({
        organizationId: bankAccount.organizationId,
        bankAccountId: bankAccount.id,
        fileName,
        content: cnabContent,
        remittanceNumber: bankAccount.nextRemittanceNumber || 1,
        type: "PAYMENT",
        status: "GENERATED",
        totalRecords: payables.length,
        totalAmount: totalAmount.toString(),
        createdBy: "system", // TODO: Pegar usuário logado
      })
      .$returningId();

    // === ATUALIZAR CONTADOR DE REMESSAS ===
    await db
      .update(bankAccounts)
      .set({
        nextRemittanceNumber: (bankAccount.nextRemittanceNumber || 1) + 1,
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, bankAccount.id));

    // === MARCAR TÍTULOS COMO "PROCESSING" ===
    await db
      .update(accountsPayable)
      .set({
        status: "PROCESSING",
        updatedAt: new Date(),
      })
      .where(inArray(accountsPayable.id, payableIds));

    // === RETORNAR RESULTADO ===
    return NextResponse.json({
      success: true,
      remittance: {
        id: remittance.id,
        fileName,
        totalRecords: payables.length,
        totalAmount,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao gerar remessa:", error);
    return NextResponse.json(
      { error: "Falha ao gerar remessa CNAB" },
      { status: 500 }
    );
  }
}

















