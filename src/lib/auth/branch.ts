import { NextResponse } from "next/server";
import type { TenantContext } from "@/lib/auth/context";
import { hasAccessToBranch } from "@/lib/auth/context";

type HeadersLike = { get(name: string): string | null };

/**
 * Resolve a filial (branchId) a partir de:
 * - Header `x-branch-id` (prioridade)
 * - fallback: `ctx.defaultBranchId`
 *
 * Valida permissão (`hasAccessToBranch`) e lança `NextResponse` padronizado
 * em caso de erro (400/403).
 */
export function resolveBranchIdOrThrow(headers: HeadersLike, ctx: TenantContext): number {
  const branchHeader = headers.get("x-branch-id");
  const candidate = branchHeader ? Number(branchHeader) : ctx.defaultBranchId;

  if (!candidate || Number.isNaN(candidate)) {
    throw NextResponse.json({ error: "Informe x-branch-id (ou defina defaultBranchId)" }, { status: 400 });
  }

  const branchId = Number(candidate);
  if (!Number.isFinite(branchId) || branchId <= 0) {
    throw NextResponse.json({ error: "x-branch-id inválido" }, { status: 400 });
  }

  if (!hasAccessToBranch(ctx, branchId)) {
    throw NextResponse.json({ error: "Forbidden", message: "Sem acesso à filial informada" }, { status: 403 });
  }

  return branchId;
}










