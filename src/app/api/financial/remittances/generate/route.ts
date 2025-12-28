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
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from "@/lib/auth/branch";
import { createHash } from "crypto";
import { queryFirst, insertReturning } from "@/lib/db/query-helpers";
import { acquireIdempotency, finalizeIdempotency } from "@/lib/idempotency/sql-idempotency";

export const runtime = "nodejs";

function isInternalTokenOk(req: NextRequest) {
  const auditToken = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerAuditToken = req.headers.get("x-audit-token");
  if (auditToken && headerAuditToken && headerAuditToken === auditToken) return true;

  const diagToken = process.env.INTERNAL_DIAGNOSTICS_TOKEN;
  const headerDiagToken =
    req.headers.get("x-internal-token") || req.headers.get("x-diagnostics-token");
  if (diagToken && headerDiagToken && headerDiagToken === diagToken) return true;

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const tokenOk = isInternalTokenOk(request);
    const ctx = tokenOk
      ? {
          userId: "SYSTEM",
          organizationId: Number(request.headers.get("x-organization-id")),
          role: "ADMIN",
          defaultBranchId: null,
          allowedBranches: [],
          isAdmin: true,
        }
      : await getTenantContext();

    if (tokenOk && (!Number.isFinite(ctx.organizationId) || ctx.organizationId <= 0)) {
      return NextResponse.json(
        { error: "Informe x-organization-id (modo token)" },
        { status: 400 }
      );
    }

    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    const body = await request.json();
    const { bankAccountId, payableIds } = body;

    // === VALIDAÇÃO ===
    if (!bankAccountId || !Array.isArray(payableIds) || payableIds.length === 0) {
      return NextResponse.json(
        { error: "Informe a conta bancária e os títulos a pagar" },
        { status: 400 }
      );
    }

    // === IDEMPOTÊNCIA (efeito único) ===
    // Deve ocorrer ANTES de qualquer validação baseada em estado mutável (ex.: títulos OPEN),
    // para que retries com a mesma key retornem o mesmo sucesso mesmo após mudanças de status.
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
        const existing = await queryFirst<typeof bankRemittances.$inferSelect>(
          db
            .select()
            .from(bankRemittances)
            .where(
              and(
                eq(bankRemittances.id, match),
                eq(bankRemittances.organizationId, ctx.organizationId),
                isNull(bankRemittances.deletedAt)
              )
            )
        );
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

    const finalizeFailedAndContinue = async (errorMessage: string) => {
      try {
        await finalizeIdempotency({
          organizationId: ctx.organizationId,
          scope,
          key: idemKey,
          status: "FAILED",
          errorMessage,
        });
      } catch (e: any) {
        console.error("⚠️ Falha ao finalizar idempotência (FAILED):", e);
      }
    };

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
      await finalizeFailedAndContinue("Conta bancária não encontrada");
      return NextResponse.json(
        { error: "Conta bancária não encontrada" },
        { status: 404 }
      );
    }

    // === BUSCAR DADOS DA FILIAL (EMPRESA) ===
    const branch = await queryFirst<typeof branches.$inferSelect>(
      db
        .select()
        .from(branches)
        .where(
          and(
            eq(branches.organizationId, ctx.organizationId),
            eq(branches.id, branchId),
            isNull(branches.deletedAt)
          )
        )
    );

    if (!branch) {
      await finalizeFailedAndContinue("Filial não encontrada");
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
      await finalizeFailedAndContinue("Nenhum título em aberto encontrado");
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

    // Tudo abaixo é mutação; precisa ser atômico.
    // Se o INSERT da remessa acontecer e algum UPDATE falhar depois, um retry com status FAILED
    // pode inserir remessa duplicada. Por isso, usamos transação.
    let remittance: { id: number } | null = null;
    try {
      remittance = await db.transaction(async (tx) => {
        const insertQuery = tx
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
          });

        const createdId = await insertReturning(insertQuery, { id: bankRemittances.id });
        const remittanceId = createdId[0]?.id;
        if (!Number.isFinite(remittanceId) || remittanceId <= 0) {
          throw new Error("Falha ao criar remessa (id não retornado)");
        }

        // === ATUALIZAR CONTADOR DE REMESSAS ===
        await tx
          .update(bankAccounts)
          .set({
            nextRemittanceNumber: (bankAccount.nextRemittanceNumber || 1) + 1,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(bankAccounts.id, bankAccount.id),
              eq(bankAccounts.organizationId, ctx.organizationId),
              isNull(bankAccounts.deletedAt)
            )
          );

        // === MARCAR TÍTULOS COMO "PROCESSING" ===
        await tx
          .update(accountsPayable)
          .set({
            status: "PROCESSING",
            updatedAt: new Date(),
          })
          .where(
            and(
              inArray(accountsPayable.id, payableIds),
              eq(accountsPayable.organizationId, ctx.organizationId),
              eq(accountsPayable.status, "OPEN"),
              isNull(accountsPayable.deletedAt)
            )
          );

        return { id: remittanceId };
      });

      // Idempotência: best-effort (não derruba sucesso da operação se a finalização falhar).
      try {
        await finalizeIdempotency({
          organizationId: ctx.organizationId,
          scope,
          key: idemKey,
          status: "SUCCEEDED",
          resultRef: `bank_remittances:${remittance.id}`,
        });
      } catch (e: any) {
        console.error("⚠️ Falha ao finalizar idempotência (SUCCEEDED):", e);
      }
    } catch (e: any) {
      try {
        await finalizeIdempotency({
          organizationId: ctx.organizationId,
          scope,
          key: idemKey,
          status: "FAILED",
          errorMessage: e?.message ?? String(e),
        });
      } catch (e2: any) {
        console.error("⚠️ Falha ao finalizar idempotência (FAILED):", e2);
      }
      throw e;
    }

    if (!remittance) {
      throw new Error("Falha ao gerar remessa");
    }

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

















