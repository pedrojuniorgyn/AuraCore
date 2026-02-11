/**
 * API: Gerar Remessa CNAB 240
 * POST /api/financial/remittances/generate
 * 
 * @since E9 Fase 2 - Migrado para ICnabGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { withDI } from "@/shared/infrastructure/di/with-di";
import { db } from "@/lib/db";
import { bankAccounts, accountsPayable, bankRemittances, branches } from "@/lib/db/schema";
import { and, eq, inArray, isNull, asc } from "drizzle-orm";
import { container } from "@/shared/infrastructure/di/container";
import { FINANCIAL_TOKENS } from "@/modules/financial/infrastructure/di/FinancialModule";
import type { ICnabGateway } from "@/modules/financial/domain/ports/output/ICnabGateway";
import { Result } from "@/shared/domain";
import { format } from "date-fns";
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from "@/lib/auth/branch";
import { createHash } from "crypto";
import { queryFirst, insertReturning } from "@/lib/db/query-helpers";
import { acquireIdempotency, finalizeIdempotency } from "@/lib/idempotency/sql-idempotency";

import { logger } from '@/shared/infrastructure/logging';
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

export const POST = withDI(async (request: NextRequest) => {
  try {
    const tokenOk = isInternalTokenOk(request);
    const headerBranchId = Number(request.headers.get("x-branch-id") || "1");
    const ctx = tokenOk
      ? {
          userId: "SYSTEM",
          organizationId: Number(request.headers.get("x-organization-id")),
          role: "ADMIN",
          branchId: headerBranchId,
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

    // === IDEMPOTÊNCIA ===
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
            .orderBy(asc(bankRemittances.id))
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
      } catch (e: unknown) {
        logger.error("⚠️ Falha ao finalizar idempotência (FAILED):", e);
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

    // === BUSCAR DADOS DA FILIAL ===
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
        .orderBy(asc(branches.id))
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

    // === GERAR CNAB VIA GATEWAY ===
    const cnabGateway = container.resolve<ICnabGateway>(
      FINANCIAL_TOKENS.CnabGateway
    );

    const cnabResult = await cnabGateway.generateCnab240({
      organizationId: ctx.organizationId,
      branchId,
      bankCode: bankAccount.bankCode || "208",
      bankAgency: bankAccount.agency || "0001",
      bankAccount: bankAccount.accountNumber || "0000000001",
      payableIds,
      paymentDate: new Date(),
    });

    if (Result.isFail(cnabResult)) {
      await finalizeFailedAndContinue(cnabResult.error);
      return NextResponse.json(
        { error: cnabResult.error },
        { status: 500 }
      );
    }

    const cnabData = cnabResult.value;

    // === SALVAR REMESSA ===
    const fileName = `REM_${format(new Date(), "yyyyMMdd")}_${String(
      bankAccount.nextRemittanceNumber
    ).padStart(3, "0")}.rem`;

    const totalAmount = payables.reduce(
      (sum, p) => sum + Number(p.payable.amount),
      0
    );

    let remittance: { id: number } | null = null;
    try {
      remittance = await db.transaction(async (tx) => {
        const insertQuery = tx
          .insert(bankRemittances)
          .values({
            organizationId: ctx.organizationId,
            bankAccountId: bankAccount.id,
            fileName,
            content: cnabData.content,
            remittanceNumber: bankAccount.nextRemittanceNumber || 1,
            type: "PAYMENT",
            status: "GENERATED",
            totalRecords: payables.length,
            totalAmount: totalAmount.toString(),
            createdBy: ctx.userId,
          });

        const createdId = await insertReturning(insertQuery, { id: bankRemittances.id }) as Array<Record<string, unknown>>;
        const remittanceId = Number(createdId[0]?.id);
        if (!Number.isFinite(remittanceId) || remittanceId <= 0) {
          throw new Error("Falha ao criar remessa (id não retornado)");
        }

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

      try {
        await finalizeIdempotency({
          organizationId: ctx.organizationId,
          scope,
          key: idemKey,
          status: "SUCCEEDED",
          resultRef: `bank_remittances:${remittance.id}`,
        });
      } catch (e: unknown) {
        logger.error("⚠️ Falha ao finalizar idempotência (SUCCEEDED):", e);
      }
    } catch (e: unknown) {
      try {
        await finalizeIdempotency({
          organizationId: ctx.organizationId,
          scope,
          key: idemKey,
          status: "FAILED",
          errorMessage: e instanceof Error ? e.message : String(e),
        });
      } catch (e2: unknown) {
        logger.error("⚠️ Falha ao finalizar idempotência (FAILED):", e2);
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
    if (error instanceof Response) return error;
    logger.error("❌ Erro ao gerar remessa:", error);
    return NextResponse.json(
      { error: "Falha ao gerar remessa CNAB" },
      { status: 500 }
    );
  }
});
