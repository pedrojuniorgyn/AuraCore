import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Matcher ignorando arquivos estáticos e api auth
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
