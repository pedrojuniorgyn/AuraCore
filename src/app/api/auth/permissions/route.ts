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

    if (!session?.user?.id) {
      return NextResponse.json({ permissions: [] });
    }

    const permissions = await getUserPermissions(session.user.id);

    return NextResponse.json({
      success: true,
      permissions,
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar permissões:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}






















