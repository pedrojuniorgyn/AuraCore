import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPermissions } from "@/lib/auth/permissions";
import { CacheService, CacheTTL } from "@/services/cache.service";

/**
 * GET /api/auth/permissions
 * Retorna as permissões do usuário logado
 * 
 * Cache:
 * - TTL: 24 horas (CacheTTL.LONG)
 * - Key: org:{organizationId}:user:{userId}
 * - Prefix: permissions:
 * - Invalidação: POST/PUT/DELETE em /api/admin/users/[id]/access
 */
export async function GET() {
  try {
    const session = await auth();

    console.log("🔍 [API /auth/permissions] Session:", {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      organizationId: (session?.user as unknown as { organizationId?: number })?.organizationId,
    });

    if (!session?.user?.id) {
      console.warn("⚠️ [API /auth/permissions] Usuário não autenticado");
      return NextResponse.json({ permissions: [], message: "Não autenticado" });
    }

    // Obter organizationId do session (multi-tenancy)
    const organizationId = (session.user as unknown as { organizationId?: number })?.organizationId;
    if (!organizationId) {
      console.error("⚠️ [API /auth/permissions] organizationId missing in session");
      return NextResponse.json({ permissions: [], message: "Organization context missing" }, { status: 400 });
    }

    const cacheKey = `org:${organizationId}:user:${session.user.id}`;
    
    // Tentar buscar do cache
    const cached = await CacheService.get<string[]>(cacheKey, 'permissions:');
    if (cached) {
      console.log("✅ [API /auth/permissions] Cache HIT");
      return NextResponse.json({
        success: true,
        permissions: cached,
        userId: session.user.id,
      }, {
        headers: {
          'X-Cache': 'HIT',
          'X-Cache-Key': `permissions:${cacheKey}`,
        },
      });
    }

    // Cache MISS - buscar do banco
    console.log("⚠️ [API /auth/permissions] Cache MISS - fetching from DB");
    const permissions = await getUserPermissions(session.user.id);

    // Cachear resultado
    await CacheService.set(cacheKey, permissions, CacheTTL.LONG, 'permissions:');

    console.log("✅ [API /auth/permissions] Permissões retornadas:", permissions.length, permissions);

    return NextResponse.json({
      success: true,
      permissions,
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
    console.error("❌ Erro ao buscar permissões:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

































