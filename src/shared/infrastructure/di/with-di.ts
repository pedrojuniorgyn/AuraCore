/**
 * withDI - Route Handler Wrapper for DI Initialization
 *
 * Garante que o container DI está inicializado antes de executar
 * qualquer API route handler em Next.js production.
 *
 * @example
 * // Em src/app/api/strategic/war-room/dashboard/route.ts
 * import { withDI } from '@/shared/infrastructure/di/with-di';
 *
 * export const GET = withDI(async (req) => {
 *   const repo = container.resolve(TOKENS.Repository);
 *   // ...
 *   return NextResponse.json(data);
 * });
 *
 * @module shared/infrastructure/di
 * @since E14.8
 */
// CRÍTICO: Polyfill DEVE ser importado ANTES de qualquer módulo com decorators
import './reflect-polyfill';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDIInitializedAsync } from './ensure-initialized';

/**
 * Tipo para route context (dynamic segments)
 */
interface RouteContext {
  params: Promise<Record<string, string>> | Record<string, string>;
}

/**
 * Response types - aceita Response nativo ou NextResponse
 * (handlers podem retornar Response quando propagam erros de auth)
 */
type ApiResponse = Response | NextResponse;

/**
 * Handler type for API routes without context
 */
type SimpleHandler = (req: NextRequest) => Promise<ApiResponse>;

/**
 * Handler type for API routes with context (dynamic segments)
 */
type ContextHandler = (
  req: NextRequest,
  context: RouteContext
) => Promise<ApiResponse>;

/**
 * Wrapper para rotas API que garante DI inicializado.
 *
 * Uso simples (sem parâmetros dinâmicos):
 * ```typescript
 * export const GET = withDI(async (req) => {
 *   return NextResponse.json({ ok: true });
 * });
 * ```
 *
 * Uso com parâmetros dinâmicos:
 * ```typescript
 * export const GET = withDI(async (req, context) => {
 *   const { id } = await context.params;
 *   return NextResponse.json({ id });
 * });
 * ```
 */
export function withDI(handler: SimpleHandler): SimpleHandler;
export function withDI(handler: ContextHandler): ContextHandler;
export function withDI(
  handler: SimpleHandler | ContextHandler
): SimpleHandler | ContextHandler {
  return async (
    req: NextRequest,
    context?: RouteContext
  ): Promise<ApiResponse> => {
    // Garantir DI inicializado ANTES de executar handler (ASYNC)
    await ensureDIInitializedAsync();

    // Executar handler original
    if (context !== undefined) {
      return (handler as ContextHandler)(req, context);
    }
    return (handler as SimpleHandler)(req);
  };
}

/**
 * Alias para melhor semântica em comandos (POST, PUT, DELETE)
 */
export const withDICommand = withDI;

/**
 * Alias para melhor semântica em queries (GET)
 */
export const withDIQuery = withDI;
