import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPermissions } from "@/lib/auth/permissions";

/**
 * GET /api/auth/permissions
 * Retorna as permissões do usuário logado
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

    const permissions = await getUserPermissions(session.user.id);

    console.log("✅ [API /auth/permissions] Permissões retornadas:", permissions.length, permissions);

    return NextResponse.json({
      success: true,
      permissions,
      userId: session.user.id,
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

































