import { eq, and, isNull } from "drizzle-orm";
import { db, ensureConnection } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { type Adapter, type AdapterUser } from "next-auth/adapters";

export function MSSQLDrizzleAdapter(): Adapter {
  async function ensureDb() {
    // Evita race condition de pool desconectado no runtime do NextAuth
    await ensureConnection();
  }

  // Helper para mapear schema user para AdapterUser
  function toAdapterUser(user: typeof users.$inferSelect): AdapterUser {
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      image: user.image,
      role: user.role ?? "USER",
      organizationId: user.organizationId,
      defaultBranchId: user.defaultBranchId,
    };
  }

  return {
    async createUser(data) {
      await ensureDb();
      /**
       * 🔐 MODELO A (Enterprise):
       * Não permitimos auto-provisionamento via OAuth.
       * O usuário deve ser pré-cadastrado (invite) com organization_id + roles/filiais.
       */
      throw new Error(
        "AUTO_PROVISION_DISABLED: Usuário não pré-cadastrado. Peça ao administrador para convidar este email antes do primeiro login."
      );
    },
    async getUser(id) {
      await ensureDb();
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id), isNull(users.deletedAt)));
      return user ? toAdapterUser(user) : null;
    },
    async getUserByEmail(email) {
      await ensureDb();
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), isNull(users.deletedAt)));
      return user ? toAdapterUser(user) : null;
    },
    async getUserByAccount({ providerAccountId, provider }) {
      await ensureDb();
      const [account] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.providerAccountId, providerAccountId),
            eq(accounts.provider, provider)
          )
        );

      if (!account) return null;

      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, account.userId), isNull(users.deletedAt)));
      
      return user ? toAdapterUser(user) : null;
    },
    async updateUser(data) {
      await ensureDb();
      if (!data.id) throw new Error("User ID is required for update");
      
      await db
        .update(users)
        .set(data)
        .where(eq(users.id, data.id));
        
      const [user] = await db.select().from(users).where(eq(users.id, data.id));
      return user ? toAdapterUser(user) : ({} as AdapterUser);
    },
    async linkAccount(data) {
      await ensureDb();
      await db.insert(accounts).values(data);
      return data; // Auth.js doesn't require full return here usually
    },
    async createSession(data) {
      await ensureDb();
      await db.insert(sessions).values(data);
      return data;
    },
    async getSessionAndUser(sessionToken) {
      await ensureDb();
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, sessionToken));

      if (!session) return null;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId));

      if (!user) return null;

      return { session, user: toAdapterUser(user) };
    },
    async updateSession(data) {
      await ensureDb();
      await db
        .update(sessions)
        .set(data)
        .where(eq(sessions.sessionToken, data.sessionToken));

      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, data.sessionToken));
        
      return session;
    },
    async deleteSession(sessionToken) {
      await ensureDb();
      await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    },
    async createVerificationToken(data) {
      await ensureDb();
      await db.insert(verificationTokens).values(data);
      return data;
    },
    async useVerificationToken({ identifier, token }) {
      await ensureDb();
      const [vt] = await db
        .select()
        .from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, identifier),
            eq(verificationTokens.token, token)
          )
        );

      if (!vt) return null;

      await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, identifier),
            eq(verificationTokens.token, token)
          )
        );

      return vt;
    },
  };
}



















