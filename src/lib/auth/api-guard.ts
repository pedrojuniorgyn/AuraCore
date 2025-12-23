import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "./permissions";
import { log } from "@/lib/observability/logger";
import { getOrCreateRequestId } from "@/lib/observability/request-id";
import { pushRequestLog } from "@/lib/observability/request-buffer";

/**
 * Guard para proteger API routes com permissões
 * 
 * @example
 * export async function POST(req: NextRequest) {
 *   return withPermission(req, "fiscal.cte.create", async (user, ctx) => {
 *     // Sua lógica aqui
 *     return NextResponse.json({ success: true });
 *   });
 * }
 */
export async function withPermission<T>(
  req: NextRequest,
  permissionCode: string,
  handler: (user: any, ctx: any) => Promise<Response>
): Promise<Response> {
  const startedAt = Date.now();
  const requestId = getOrCreateRequestId(req.headers);
  const method = req.method;
  const path = new URL(req.url).pathname;
  try {
    // 1. Verificar autenticação
    const session = await auth();
    if (!session?.user?.id) {
      const res = NextResponse.json(
        { error: "Unauthorized", message: "Sessão inválida ou expirada" },
        { status: 401 }
      );
      pushRequestLog({
        ts: new Date().toISOString(),
        requestId,
        method,
        path,
        status: 401,
        durationMs: Date.now() - startedAt,
        permission: permissionCode,
      });
      log("warn", "api.unauthorized", { requestId, method, path, status: 401, permission: permissionCode });
      return res;
    }

    // 2. Verificar permissão
    const hasAccess = await hasPermission(session.user.id, permissionCode);
    if (!hasAccess) {
      const res = NextResponse.json(
        {
          error: "Forbidden",
          message: `Você não tem permissão para esta ação`,
          required: permissionCode,
        },
        { status: 403 }
      );
      pushRequestLog({
        ts: new Date().toISOString(),
        requestId,
        method,
        path,
        status: 403,
        durationMs: Date.now() - startedAt,
        userId: session.user.id,
        organizationId: (session.user as any).organizationId,
        branchId: ((session.user as any).branchId ?? (session.user as any).defaultBranchId ?? null) as any,
        permission: permissionCode,
      });
      log("warn", "api.forbidden", {
        requestId,
        method,
        path,
        status: 403,
        userId: session.user.id,
        organizationId: (session.user as any).organizationId,
        permission: permissionCode,
      });
      return res;
    }

    // 3. Executar handler com contexto
    // Padronização: expor `userId` diretamente (evita usos incorretos acessando o id via `ctx.user`).
    // Importante: várias rotas (ex.: Auditoria) dependem de `isAdmin` e `allowedBranches`
    // para aplicar Data Scoping. Esses campos já estão presentes na sessão (callbacks do NextAuth).
    const role = (session.user as any)?.role ?? "USER";
    const allowedBranches = Array.isArray((session.user as any)?.allowedBranches)
      ? ((session.user as any).allowedBranches as number[])
      : [];
    const defaultBranchId =
      (session.user as any)?.defaultBranchId !== undefined ? (session.user as any).defaultBranchId : null;
    const isAdmin = role === "ADMIN";

    const ctx = {
      user: session.user,
      userId: session.user.id,
      role,
      isAdmin,
      defaultBranchId,
      allowedBranches,
      // Compatibilidade: alguns handlers antigos usam branchId; preferir defaultBranchId quando existir.
      branchId:
        (session.user as any).branchId ??
        defaultBranchId ??
        null,
      organizationId: (session.user as any).organizationId,
    };

    const res = await handler(session.user, ctx);
    const durationMs = Date.now() - startedAt;
    pushRequestLog({
      ts: new Date().toISOString(),
      requestId,
      method,
      path,
      status: (res as any)?.status ?? 200,
      durationMs,
      userId: session.user.id,
      organizationId: (session.user as any).organizationId,
      branchId: ctx.branchId,
      permission: permissionCode,
    });
    log("info", "api.request", {
      requestId,
      method,
      path,
      status: (res as any)?.status ?? 200,
      durationMs,
      userId: session.user.id,
      organizationId: (session.user as any).organizationId,
      branchId: ctx.branchId,
      permission: permissionCode,
    });
    return res;
  } catch (error: any) {
    const durationMs = Date.now() - startedAt;
    pushRequestLog({
      ts: new Date().toISOString(),
      requestId,
      method,
      path,
      status: 500,
      durationMs,
      permission: permissionCode,
    });
    log("error", "api.error", { requestId, method, path, status: 500, durationMs, permission: permissionCode, error });
    return NextResponse.json(
      { error: "Internal Server Error", message: error?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}

/**
 * Guard apenas para autenticação (sem verificar permissão)
 */
export async function withAuth<T>(
  req: NextRequest,
  handler: (user: any, ctx: any) => Promise<Response>
): Promise<Response> {
  const startedAt = Date.now();
  const requestId = getOrCreateRequestId(req.headers);
  const method = req.method;
  const path = new URL(req.url).pathname;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      const res = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
      pushRequestLog({
        ts: new Date().toISOString(),
        requestId,
        method,
        path,
        status: 401,
        durationMs: Date.now() - startedAt,
      });
      log("warn", "api.unauthorized", { requestId, method, path, status: 401 });
      return res;
    }

    const role = (session.user as any)?.role ?? "USER";
    const allowedBranches = Array.isArray((session.user as any)?.allowedBranches)
      ? ((session.user as any).allowedBranches as number[])
      : [];
    const defaultBranchId =
      (session.user as any)?.defaultBranchId !== undefined ? (session.user as any).defaultBranchId : null;
    const isAdmin = role === "ADMIN";

    const ctx = {
      user: session.user,
      userId: session.user.id,
      role,
      isAdmin,
      defaultBranchId,
      allowedBranches,
      branchId:
        (session.user as any).branchId ??
        defaultBranchId ??
        null,
      organizationId: (session.user as any).organizationId,
    };

    const res = await handler(session.user, ctx);
    const durationMs = Date.now() - startedAt;
    pushRequestLog({
      ts: new Date().toISOString(),
      requestId,
      method,
      path,
      status: (res as any)?.status ?? 200,
      durationMs,
      userId: session.user.id,
      organizationId: (session.user as any).organizationId,
      branchId: ctx.branchId,
    });
    log("info", "api.request", {
      requestId,
      method,
      path,
      status: (res as any)?.status ?? 200,
      durationMs,
      userId: session.user.id,
      organizationId: (session.user as any).organizationId,
      branchId: ctx.branchId,
    });
    return res;
  } catch (error: any) {
    const durationMs = Date.now() - startedAt;
    pushRequestLog({
      ts: new Date().toISOString(),
      requestId,
      method,
      path,
      status: 500,
      durationMs,
    });
    log("error", "api.error", { requestId, method, path, status: 500, durationMs, error });
    return NextResponse.json(
      { error: "Internal Server Error", message: error?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}



















