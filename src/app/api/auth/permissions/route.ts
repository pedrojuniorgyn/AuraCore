import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPermissions } from "@/lib/auth/permissions";
import { CacheService, CacheTTL } from "@/services/cache.service";
import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';

/** Session user type com campos extended */
interface SessionUser {
  id: string;
  organizationId?: number;
  role?: string;
  allowedBranches?: number[];
  defaultBranchId?: number | null;
}

/**
 * GET /api/auth/permissions
 * Retorna as permissões + branches do usuário logado (RBAC + ABAC)
 * 
 * Cache:
 * - TTL: 24 horas (CacheTTL.LONG)
 * - Key: org:{organizationId}:user:{userId}
 * - Prefix: permissions:
 * - Invalidação: POST/PUT/DELETE em /api/admin/users/[id]/access
 * 
 * Response:
 * - permissions: string[] (slugs de permissões RBAC)
 * - allowedBranches: number[] (IDs de branches ABAC)
 * - role: string (role do usuário)
 * - isAdmin: boolean (bypass ABAC se true)
 */
export const GET = withDI(async () => {
  try {
    const session = await auth();

    logger.info('🔍 [API /auth/permissions] Session', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      organizationId: (session?.user as unknown as SessionUser)?.organizationId,
    });

    if (!session?.user?.id) {
      logger.warn('⚠️ [API /auth/permissions] Usuário não autenticado');
      return NextResponse.json({ 
        permissions: [], 
        allowedBranches: [],
        role: null,
        isAdmin: false,
        message: "Não autenticado" 
      });
    }

    // Extrair dados da session (multi-tenancy + ABAC)
    const sessionUser = session.user as unknown as SessionUser;
    const organizationId = sessionUser.organizationId;
    const role = sessionUser.role ?? "USER";
    const isAdmin = role === "ADMIN";
    const allowedBranches = Array.isArray(sessionUser.allowedBranches) 
      ? sessionUser.allowedBranches 
      : [];

    if (!organizationId) {
      logger.error('⚠️ [API /auth/permissions] organizationId missing in session');
      return NextResponse.json({ 
        permissions: [], 
        allowedBranches: [],
        role,
        isAdmin,
        message: "Organization context missing" 
      }, { status: 400 });
    }

    const cacheKey = `org:${organizationId}:user:${session.user.id}`;
    
    // Tentar buscar permissões do cache
    const cached = await CacheService.get<string[]>(cacheKey, 'permissions:');
    if (cached) {
      logger.info('✅ [API /auth/permissions] Cache HIT');
      return NextResponse.json({
        success: true,
        permissions: cached,
        allowedBranches,
        role,
        isAdmin,
        userId: session.user.id,
      }, {
        headers: {
          'X-Cache': 'HIT',
          'X-Cache-Key': `permissions:${cacheKey}`,
        },
      });
    }

    // Cache MISS - buscar do banco
    logger.info('⚠️ [API /auth/permissions] Cache MISS - fetching from DB');
    const permissions = await getUserPermissions(session.user.id);

    // Cachear apenas permissions (allowedBranches vem da session)
    await CacheService.set(cacheKey, permissions, CacheTTL.LONG, 'permissions:');

    logger.info('✅ [API /auth/permissions] Permissões retornadas', { permissionsLength: permissions.length });

    return NextResponse.json({
      success: true,
      permissions,
      allowedBranches,
      role,
      isAdmin,
      userId: session.user.id,
    }, {
      headers: {
        'X-Cache': 'MISS',
        'X-Cache-TTL': String(CacheTTL.LONG),
      },
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Erro ao buscar permissões', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});

































