import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "./permissions";
import { log } from "@/lib/observability/logger";
import { getOrCreateRequestId } from "@/lib/observability/request-id";
import { pushRequestLog } from "@/lib/observability/request-buffer";

/**
 * Contexto de execução da API com informações do usuário autenticado
 */
export interface ApiContext {
  user: unknown;
  userId: string;
  role: string;
  isAdmin: boolean;
  defaultBranchId: number | null;
  allowedBranches: number[];
  branchId: number | null;
  organizationId: number;
}

function buildTelemetryHeaders(requestId: string, durationMs: number) {
  const headers = new Headers();
  headers.set("x-request-id", requestId);
  // Ajuda debugging em DevTools e em proxies (Coolify)
  headers.set("server-timing", `app;dur=${Math.max(0, Math.round(durationMs))}`);
  return headers;
}

function withTelemetryHeaders(res: Response, requestId: string, durationMs: number): Response {
  const h = new Headers(res.headers);
  const telemetry = buildTelemetryHeaders(requestId, durationMs);
  telemetry.forEach((v, k) => h.set(k, v));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

function getSlowThresholdMs() {
  const raw = process.env.OBS_SLOW_MS;
  const n = raw !== undefined ? Number(raw) : 1500;
  return Number.isFinite(n) ? Math.max(0, n) : 1500;
}

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
  handler: (user: unknown, ctx: ApiContext) => Promise<Response>
): Promise<Response> {
  const startedAt = Date.now();
  const requestId = getOrCreateRequestId(req.headers);
  const method = req.method;
  const path = new URL(req.url).pathname;
  try {
    // 1. Verificar autenticação
    const session = await auth();
    if (!session?.user?.id) {
      const durationMs = Date.now() - startedAt;
      const res = NextResponse.json(
        { error: "Unauthorized", message: "Sessão inválida ou expirada" },
        { status: 401, headers: buildTelemetryHeaders(requestId, durationMs) }
      );
      pushRequestLog({
        ts: new Date().toISOString(),
        requestId,
        method,
        path,
        status: 401,
        durationMs,
        permission: permissionCode,
      });
      log("warn", "api.unauthorized", { requestId, method, path, status: 401, permission: permissionCode });
      return res;
    }

    // 2. Verificar permissão
    const hasAccess = await hasPermission(session.user.id, permissionCode);
    if (!hasAccess) {
      const durationMs = Date.now() - startedAt;
      const res = NextResponse.json(
        {
          error: "Forbidden",
          message: `Você não tem permissão para esta ação`,
          required: permissionCode,
        },
        { status: 403, headers: buildTelemetryHeaders(requestId, durationMs) }
      );
      pushRequestLog({
        ts: new Date().toISOString(),
        requestId,
        method,
        path,
        status: 403,
        durationMs,
        userId: session.user.id,
        organizationId: (session.user as unknown).organizationId,
        branchId: ((session.user as unknown).branchId ?? (session.user as unknown).defaultBranchId ?? null) as unknown,
        permission: permissionCode,
      });
      log("warn", "api.forbidden", {
        requestId,
        method,
        path,
        status: 403,
        userId: session.user.id,
        organizationId: (session.user as unknown).organizationId,
        permission: permissionCode,
      });
      return res;
    }

    // 3. Executar handler com contexto
    // Padronização: expor `userId` diretamente (evita usos incorretos acessando o id via `ctx.user`).
    // Importante: várias rotas (ex.: Auditoria) dependem de `isAdmin` e `allowedBranches`
    // para aplicar Data Scoping. Esses campos já estão presentes na sessão (callbacks do NextAuth).
    const role = (session.user as unknown)?.role ?? "USER";
    const allowedBranches = Array.isArray((session.user as unknown)?.allowedBranches)
      ? ((session.user as unknown).allowedBranches as number[])
      : [];
    const defaultBranchId =
      (session.user as unknown)?.defaultBranchId !== undefined ? (session.user as unknown).defaultBranchId : null;
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
        (session.user as unknown).branchId ??
        defaultBranchId ??
        null,
      organizationId: (session.user as unknown).organizationId,
    };

    const res = await handler(session.user, ctx);
    const durationMs = Date.now() - startedAt;
    const slowMs = getSlowThresholdMs();
    pushRequestLog({
      ts: new Date().toISOString(),
      requestId,
      method,
      path,
      status: (res as unknown)?.status ?? 200,
      durationMs,
      userId: session.user.id,
      organizationId: (session.user as unknown).organizationId,
      branchId: ctx.branchId,
      permission: permissionCode,
    });
    log("info", "api.request", {
      requestId,
      method,
      path,
      status: (res as unknown)?.status ?? 200,
      durationMs,
      userId: session.user.id,
      organizationId: (session.user as unknown).organizationId,
      branchId: ctx.branchId,
      permission: permissionCode,
    });
    if (durationMs >= slowMs) {
      log("warn", "api.slow", {
        requestId,
        method,
        path,
        status: (res as unknown)?.status ?? 200,
        durationMs,
        slowMs,
        userId: session.user.id,
        organizationId: (session.user as unknown).organizationId,
        branchId: ctx.branchId,
        permission: permissionCode,
      });
    }
    return withTelemetryHeaders(res, requestId, durationMs);
  } catch (error: unknown) {
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
      { status: 500, headers: buildTelemetryHeaders(requestId, durationMs) }
    );
  }
}

/**
 * Guard apenas para autenticação (sem verificar permissão)
 */
export async function withAuth<T>(
  req: NextRequest,
  handler: (user: unknown, ctx: ApiContext) => Promise<Response>
): Promise<Response> {
  const startedAt = Date.now();
  const requestId = getOrCreateRequestId(req.headers);
  const method = req.method;
  const path = new URL(req.url).pathname;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      const durationMs = Date.now() - startedAt;
      const res = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: buildTelemetryHeaders(requestId, durationMs) }
      );
      pushRequestLog({
        ts: new Date().toISOString(),
        requestId,
        method,
        path,
        status: 401,
        durationMs,
      });
      log("warn", "api.unauthorized", { requestId, method, path, status: 401 });
      return res;
    }

    const role = (session.user as unknown)?.role ?? "USER";
    const allowedBranches = Array.isArray((session.user as unknown)?.allowedBranches)
      ? ((session.user as unknown).allowedBranches as number[])
      : [];
    const defaultBranchId =
      (session.user as unknown)?.defaultBranchId !== undefined ? (session.user as unknown).defaultBranchId : null;
    const isAdmin = role === "ADMIN";

    const ctx = {
      user: session.user,
      userId: session.user.id,
      role,
      isAdmin,
      defaultBranchId,
      allowedBranches,
      branchId:
        (session.user as unknown).branchId ??
        defaultBranchId ??
        null,
      organizationId: (session.user as unknown).organizationId,
    };

    const res = await handler(session.user, ctx);
    const durationMs = Date.now() - startedAt;
    const slowMs = getSlowThresholdMs();
    pushRequestLog({
      ts: new Date().toISOString(),
      requestId,
      method,
      path,
      status: (res as unknown)?.status ?? 200,
      durationMs,
      userId: session.user.id,
      organizationId: (session.user as unknown).organizationId,
      branchId: ctx.branchId,
    });
    log("info", "api.request", {
      requestId,
      method,
      path,
      status: (res as unknown)?.status ?? 200,
      durationMs,
      userId: session.user.id,
      organizationId: (session.user as unknown).organizationId,
      branchId: ctx.branchId,
    });
    if (durationMs >= slowMs) {
      log("warn", "api.slow", {
        requestId,
        method,
        path,
        status: (res as unknown)?.status ?? 200,
        durationMs,
        slowMs,
        userId: session.user.id,
        organizationId: (session.user as unknown).organizationId,
        branchId: ctx.branchId,
      });
    }
    return withTelemetryHeaders(res, requestId, durationMs);
  } catch (error: unknown) {
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
      { status: 500, headers: buildTelemetryHeaders(requestId, durationMs) }
    );
  }
}



















