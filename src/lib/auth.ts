import NextAuth from "next-auth";
import { MSSQLDrizzleAdapter } from "@/lib/auth/mssql-adapter";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq, isNull } from "drizzle-orm";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MSSQLDrizzleAdapter(),
  session: {
    strategy: "jwt",
  },
  callbacks: {
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

        const email = credentials.email as string;
        
        const usersFound = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email));
        
        const user = usersFound[0];

        if (!user || !user.passwordHash) {
          return null;
        }

        // Verifica se o usuário está deletado (soft delete)
        if (user.deletedAt) {
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
