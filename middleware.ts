import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Middleware roda em Edge Runtime: não pode importar libs Node (ex.: mssql).
// Por isso usamos o authConfig "leve" (sem adapter/providers) apenas para ler o JWT/cookie.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isOnLogin = pathname.startsWith("/login");
  const isApi = pathname.startsWith("/api");
  const isApiAdmin = pathname.startsWith("/api/admin");

  // Não interferir em rotas /api (exceto /api/admin que tem regra própria abaixo).
  // Evita redirects HTML em chamadas fetch/curl.
  if (isApi && !isApiAdmin) return;

  // Auditoria: estes endpoints têm guarda própria (token ou sessão) no handler.
  // Não bloquear no middleware para permitir automação via curl/token.
  if (pathname.startsWith("/api/admin/audit/snapshots")) {
    return;
  }

  // Login:
  // - se já está logado e abre /login -> manda para home do produto (/)
  if (isOnLogin && isLoggedIn) {
    return Response.redirect(new URL("/", req.nextUrl));
  }

  // Protege todas as páginas do produto (qualquer coisa que não seja /login, /api, estático).
  // OBS: também existe uma proteção server-side no layout do (dashboard) para garantir.
  const isStatic =
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico";

  if (!isStatic && !isApi && !isOnLogin && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
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
  matcher: ["/((?!api/auth|api/health|api/admin/audit/snapshots|_next/static|_next/image|favicon.ico).*)"],
};
