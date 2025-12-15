import NextAuth from "next-auth";
// Não podemos importar config do lib/auth direto no middleware edge em alguns casos
// mas com next-auth v5 beta isso é mais flexível. Vamos tentar importar o authConfig simplificado se precisar
// Por enquanto, usamos a estratégia padrão de exportar o auth do lib/auth.

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isOnLogin = req.nextUrl.pathname.startsWith("/login");
  const isApiAdmin = req.nextUrl.pathname.startsWith("/api/admin");

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
    const role = (req.auth?.user as any)?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};

