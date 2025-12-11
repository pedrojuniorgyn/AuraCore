import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "./permissions";

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
  try {
    // 1. Verificar autenticação
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Sessão inválida ou expirada" },
        { status: 401 }
      );
    }

    // 2. Verificar permissão
    const hasAccess = await hasPermission(session.user.id, permissionCode);
    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: `Você não tem permissão para esta ação`,
          required: permissionCode,
        },
        { status: 403 }
      );
    }

    // 3. Executar handler com contexto
    const ctx = {
      user: session.user,
      branchId: (session.user as any).branchId,
      organizationId: (session.user as any).organizationId,
    };

    return await handler(session.user, ctx);
  } catch (error: any) {
    console.error("❌ Error in withPermission:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
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
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ctx = {
      user: session.user,
      branchId: (session.user as any).branchId,
      organizationId: (session.user as any).organizationId,
    };

    return await handler(session.user, ctx);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}










