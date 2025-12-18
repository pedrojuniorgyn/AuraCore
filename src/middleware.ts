import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Middleware roda em Edge Runtime: não pode importar libs Node (ex.: mssql).
// Por isso usamos o authConfig "leve" (sem adapter/providers) apenas para ler o JWT/cookie.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isOnLogin = req.nextUrl.pathname.startsWith("/login");
  const isApiAdmin = req.nextUrl.pathname.startsWith("/api/admin");
  const pathname = req.nextUrl.pathname;

  // Auditoria: estes endpoints têm guarda própria (token ou sessão) no handler.
  // Não bloqueie no middleware (evita problemas de Edge/runtime env e permite automação).
  if (pathname.startsWith("/api/admin/audit/snapshots")) {
    return;
  }

  if (isOnDashboard && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (isOnLogin && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Blindagem: endpoints admin via HTTP
  if (isApiAdmin) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (req.auth?.user as { role?: string } | undefined)?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
});

export const config = {
  // Importante: /api/admin/audit/snapshots* é protegido no próprio handler (token ou sessão),
  // então excluímos do middleware para permitir automação/execução local sem depender do Edge auth.
  matcher: ["/((?!api/auth|api/admin/audit/snapshots|_next/static|_next/image|favicon.ico).*)"],
};

