import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const isOnLogin = pathname.startsWith("/login");

      const isApi = pathname.startsWith("/api");
      const isStatic =
        pathname.startsWith("/_next/static") ||
        pathname.startsWith("/_next/image") ||
        pathname === "/favicon.ico";

      // Tudo que não for login/api/estático é "produto" e requer sessão.
      const isProductPage = !isOnLogin && !isApi && !isStatic;

      if (isProductPage) return isLoggedIn;

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      return true;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      
      if (token.role && session.user) {
        // @ts-expect-error - NextAuth types don't include custom role property
        session.user.role = token.role;
      }
      
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
  },
  providers: [], // Providers serão adicionados no auth.ts para evitar carregar libs pesadas no edge
} satisfies NextAuthConfig;
