import NextAuth from "next-auth";
import { MSSQLDrizzleAdapter } from "@/lib/auth/mssql-adapter";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq, isNull, and } from "drizzle-orm";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MSSQLDrizzleAdapter(),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    /**
     * 🔐 MODELO A (Enterprise): Google Workspace só pode logar se:
     * - email for de domínio permitido (env AUTH_GOOGLE_ALLOWED_DOMAINS)
     * - usuário já existir pré-cadastrado no banco (whitelist)
     */
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider !== "google") {
          return true;
        }

        const email = (user?.email || (profile as any)?.email || "").toString().trim().toLowerCase();
        if (!email || !email.includes("@")) {
          return false;
        }

        // 1) Validar domínio permitido (opcional)
        const allowedDomainsRaw =
          process.env.AUTH_GOOGLE_ALLOWED_DOMAINS ||
          process.env.AUTH_ALLOWED_EMAIL_DOMAINS ||
          "";
        const allowedDomains = allowedDomainsRaw
          .split(",")
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean);

        if (allowedDomains.length > 0) {
          const domain = email.split("@")[1]?.toLowerCase();
          if (!domain || !allowedDomains.includes(domain)) {
            return false;
          }
        }

        // 2) Validar email verificado (se vier do Google)
        const emailVerified = (profile as any)?.email_verified;
        if (emailVerified === false) {
          return false;
        }

        // 3) Whitelist: só permite login se usuário já existir (pré-cadastro)
        const { ensureConnection } = await import("@/lib/db");
        await ensureConnection();

        const existing = await db
          .select({ id: schema.users.id, organizationId: schema.users.organizationId })
          .from(schema.users)
          .where(and(eq(schema.users.email, email), isNull(schema.users.deletedAt)));

        // Segurança multi-tenant: se email existir em >1 organização, é ambíguo -> bloqueia
        if (existing.length !== 1) {
          return false;
        }

        return true;
      } catch (err) {
        console.error("❌ Google signIn guard error:", err);
        return false;
      }
    },
    async jwt({ token, user, trigger }) {
      // Ao fazer login (user existe)
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.defaultBranchId = user.defaultBranchId;
        
        // Busca filiais permitidas para o usuário (Data Scoping)
        const userBranchesData = await db
          .select({ branchId: schema.userBranches.branchId })
          .from(schema.userBranches)
          .where(eq(schema.userBranches.userId, user.id as string));
        
        token.allowedBranches = userBranchesData.map((ub) => ub.branchId);
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.organizationId = token.organizationId as number;
        session.user.defaultBranchId = token.defaultBranchId as number;
        session.user.allowedBranches = token.allowedBranches as number[];
      }
      return session;
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).trim().toLowerCase();
        
        const usersFound = await db
          .select()
          .from(schema.users)
          .where(and(eq(schema.users.email, email), isNull(schema.users.deletedAt)));
        
        // Segurança multi-tenant: sem contexto de org no login por email/senha,
        // bloqueia emails duplicados em mais de uma organização.
        if (usersFound.length !== 1) {
          return null;
        }

        const user = usersFound[0];

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await compare(credentials.password as string, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
          organizationId: user.organizationId,
          defaultBranchId: user.defaultBranchId,
        };
      },
    }),
  ],
});
