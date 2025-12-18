import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { bankTransactions } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

const BodySchema = z.object({
  accountsPayableId: z.number().int().positive().optional(),
  accountsReceivableId: z.number().int().positive().optional(),
  reconciled: z.enum(["S", "N"]).optional(), // default S
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext();
    const { id } = await params;
    const txId = Number(id);
    if (!Number.isFinite(txId) || txId <= 0) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido", issues: parsed.error.issues }, { status: 400 });
    }

    const desired = parsed.data.reconciled ?? "S";

    const [existing] = await db
      .select({ id: bankTransactions.id })
      .from(bankTransactions)
      .where(and(eq(bankTransactions.id, txId), eq(bankTransactions.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    await db
      .update(bankTransactions)
      .set({
        reconciled: desired,
        reconciledAt: desired === "S" ? new Date() : null,
        reconciledBy: desired === "S" ? ctx.userId : null,
        accountsPayableId: parsed.data.accountsPayableId ?? null,
        accountsReceivableId: parsed.data.accountsReceivableId ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(bankTransactions.id, txId), eq(bankTransactions.organizationId, ctx.organizationId)));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    // getTenantContext() lança Response (401/403) quando auth falha.
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "Erro ao conciliar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

