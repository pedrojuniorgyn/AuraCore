import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { type Adapter } from "next-auth/adapters";

export function MSSQLDrizzleAdapter(): Adapter {
  return {
    async createUser(data) {
      const id = crypto.randomUUID();
      await db.insert(users).values({
        ...data,
        id,
      });
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    },
    async getUser(id) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user ?? null;
    },
    async getUserByEmail(email) {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user ?? null;
    },
    async getUserByAccount({ providerAccountId, provider }) {
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
        .where(eq(users.id, account.userId));
      
      return user ?? null;
    },
    async updateUser(data) {
      if (!data.id) throw new Error("User ID is required for update");
      
      await db
        .update(users)
        .set(data)
        .where(eq(users.id, data.id));
        
      const [user] = await db.select().from(users).where(eq(users.id, data.id));
      return user;
    },
    async linkAccount(data) {
      await db.insert(accounts).values(data);
      return data; // Auth.js doesn't require full return here usually
    },
    async createSession(data) {
      await db.insert(sessions).values(data);
      return data;
    },
    async getSessionAndUser(sessionToken) {
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

      return { session, user };
    },
    async updateSession(data) {
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
      await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    },
    async createVerificationToken(data) {
      await db.insert(verificationTokens).values(data);
      return data;
    },
    async useVerificationToken({ identifier, token }) {
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



