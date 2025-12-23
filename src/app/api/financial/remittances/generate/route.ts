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
import { getTenantContext, hasAccessToBranch } from "@/lib/auth/context";
import { createHash } from "crypto";
import { acquireIdempotency, finalizeIdempotency } from "@/lib/idempotency/sql-idempotency";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext();

    // branchId vem do header e precisa ser validado contra allowedBranches
    const branchHeader = request.headers.get("x-branch-id");
    const branchId = branchHeader ? Number(branchHeader) : ctx.defaultBranchId;
    if (!branchId || Number.isNaN(branchId)) {
      return NextResponse.json(
        { error: "Informe x-branch-id (ou defina defaultBranchId)" },
        { status: 400 }
      );
    }
    if (!hasAccessToBranch(ctx, branchId)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Sem acesso à filial informada" },
        { status: 403 }
      );
    }

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
          eq(bankAccounts.organizationId, ctx.organizationId),
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
          eq(branches.organizationId, ctx.organizationId),
          eq(branches.id, branchId),
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
          eq(accountsPayable.organizationId, ctx.organizationId),
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

    // === IDEMPOTÊNCIA (efeito único) ===
    // Pode ser fornecida pelo cliente via header (recomendado).
    // Sem header, usamos hash determinístico dos parâmetros (org/branch/bankAccount/payableIds).
    const scope = "financial.remittances.generate";
    const keyFromHeader =
      request.headers.get("idempotency-key") ||
      request.headers.get("Idempotency-Key");
    const payableIdsSorted = [...payableIds].map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    const hashBase = JSON.stringify({
      organizationId: ctx.organizationId,
      branchId,
      bankAccountId,
      payableIds: payableIdsSorted,
    });
    const hash = createHash("sha256").update(hashBase).digest("hex");
    const computedKey = `remittance:${hash}`;
    const idemKey = (keyFromHeader && keyFromHeader.trim()) ? keyFromHeader.trim().slice(0, 128) : computedKey.slice(0, 128);

    const idem = await acquireIdempotency({
      organizationId: ctx.organizationId,
      scope,
      key: idemKey,
      ttlMinutes: 24 * 60,
    });
    if (idem.outcome === "hit") {
      const ref = (idem.resultRef ?? "").toString();
      const match = ref.startsWith("bank_remittances:") ? Number(ref.replace("bank_remittances:", "")) : NaN;
      if (Number.isFinite(match) && match > 0) {
        const [existing] = await db
          .select()
          .from(bankRemittances)
          .where(
            and(
              eq(bankRemittances.id, match),
              eq(bankRemittances.organizationId, ctx.organizationId),
              isNull(bankRemittances.deletedAt)
            )
          )
          .limit(1);
        if (existing) {
          return NextResponse.json({
            success: true,
            idempotency: "hit",
            remittance: {
              id: existing.id,
              fileName: existing.fileName,
              totalRecords: existing.totalRecords,
              totalAmount: Number(existing.totalAmount),
            },
          });
        }
      }
      return NextResponse.json(
        { success: true, idempotency: "hit", message: "Remessa já gerada anteriormente (efeito único)" },
        { status: 200 }
      );
    }
    if (idem.outcome === "in_progress") {
      return NextResponse.json(
        { success: true, idempotency: "in_progress", message: "Geração de remessa já está em processamento" },
        { status: 202 }
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

    let remittance: any;
    try {
      [remittance] = await db
        .insert(bankRemittances)
        .values({
          organizationId: ctx.organizationId,
          bankAccountId: bankAccount.id,
          fileName,
          content: cnabContent,
          remittanceNumber: bankAccount.nextRemittanceNumber || 1,
          type: "PAYMENT",
          status: "GENERATED",
          totalRecords: payables.length,
          totalAmount: totalAmount.toString(),
          createdBy: ctx.userId,
        })
        .$returningId();
    } catch (e: any) {
      await finalizeIdempotency({
        organizationId: ctx.organizationId,
        scope,
        key: idemKey,
        status: "FAILED",
        errorMessage: e?.message ?? String(e),
      });
      throw e;
    }

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
      .where(
        and(
          inArray(accountsPayable.id, payableIds),
          eq(accountsPayable.organizationId, ctx.organizationId)
        )
      );

    // === RETORNAR RESULTADO ===
    await finalizeIdempotency({
      organizationId: ctx.organizationId,
      scope,
      key: idemKey,
      status: "SUCCEEDED",
      resultRef: `bank_remittances:${remittance.id}`,
    });

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
    // getTenantContext() pode lançar NextResponse (401/500). Preserve.
    if (error instanceof Response) return error;
    console.error("❌ Erro ao gerar remessa:", error);
    return NextResponse.json(
      { error: "Falha ao gerar remessa CNAB" },
      { status: 500 }
    );
  }
}

















