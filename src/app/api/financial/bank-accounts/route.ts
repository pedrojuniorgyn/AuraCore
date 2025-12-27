import { NextRequest, NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import { bankAccounts } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from "@/lib/auth/branch";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/financial/bank-accounts
 */
export async function GET(request: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();

    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.organizationId, ctx.organizationId),
          isNull(bankAccounts.deletedAt)
        )
      )
      .orderBy(bankAccounts.name);

    return NextResponse.json({ data: accounts, total: accounts.length });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao listar contas bancárias:", error);
    return NextResponse.json(
      { error: "Falha ao listar contas", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/financial/bank-accounts
 */
export async function POST(request: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    await db.insert(bankAccounts).values({
      organizationId: ctx.organizationId,
      // Política: header manda; body não decide filial.
      branchId,
      name: body.name,
      bankCode: body.bankCode || null,
      bankName: body.bankName || null,
      agency: body.agency || null,
      accountNumber: body.accountNumber || null,
      accountType: body.accountType || "CHECKING",
      initialBalance: body.initialBalance?.toString() || "0.00",
      currentBalance: body.initialBalance?.toString() || "0.00",
      status: "ACTIVE",
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
      version: 1,
    });

    const [newAccount] = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.organizationId, ctx.organizationId),
          eq(bankAccounts.name, body.name)
        )
      )
      .orderBy(bankAccounts.id);

    return NextResponse.json({ data: newAccount }, { status: 201 });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao criar conta bancária:", error);
    return NextResponse.json(
      { error: "Falha ao criar conta", details: errorMessage },
      { status: 500 }
    );
  }
}
