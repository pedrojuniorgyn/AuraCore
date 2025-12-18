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

  if (isOnDashboard && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (isOnLogin && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Auditoria: estes endpoints têm guarda própria (token ou sessão) no handler.
  // Não bloquear no middleware para permitir automação via curl/token.
  if (pathname.startsWith("/api/admin/audit/snapshots")) {
    return;
  }

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
  // Matcher ignorando arquivos estáticos e api auth
  matcher: ["/((?!api/auth|api/admin/audit/snapshots|_next/static|_next/image|favicon.ico).*)"],
};
