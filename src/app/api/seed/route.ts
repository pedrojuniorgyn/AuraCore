import { getDb } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { eq, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

function seedIsEnabled() {
  // Segurança: endpoint de seed nunca deve ficar aberto em produção.
  if (process.env.NODE_ENV === "production") return false;
  return process.env.SEED_HTTP_ENABLED === "true";
}

export async function GET(req: NextRequest) {
  try {
    if (!seedIsEnabled()) {
      // 404 para não “anunciar” endpoint operacional
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Autorização: token (preferencial) OU sessão admin (fallback)
    const seedToken = process.env.SEED_HTTP_TOKEN;
    const headerToken = req.headers.get("x-seed-token");
    if (seedToken) {
      if (!headerToken || headerToken !== seedToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      const ctx = await getTenantContext();
      if (!ctx.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Garante que a conexão está estabelecida
    const db = await getDb();

    // Verifica se já existe alguma organização
    const [existingOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(isNull(organizations.deletedAt))
      .limit(1);

    if (existingOrg) {
      return NextResponse.json({ message: "Seed já realizado ou banco não está vazio." });
    }

    // 1. Cria a Organização Principal
    const [{ id: organizationId }] = await db
      .insert(organizations)
      .values({
        name: "Aura Core",
        slug: "aura-core",
        document: "00000000000000", // CNPJ de exemplo - TROQUE pelo real
        plan: "ENTERPRISE",
        status: "ACTIVE",
      })
      .$returningId();

    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    // 2. Dados do Admin Inicial
    const adminEmail = "admin@auracore.com"; // TROQUE pelo seu email real se quiser testar Google Link
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json(
        { error: "Defina SEED_ADMIN_PASSWORD no ambiente para executar o seed." },
        { status: 400 }
      );
    }

    const passwordHash = await hash(adminPassword, 10);

    // 3. Cria Admin com organizationId
    await db.insert(users).values({
      name: "Admin Aura",
      email: adminEmail,
      passwordHash: passwordHash,
      role: "ADMIN",
      image: "",
      organizationId: organizationId,
    });

    return NextResponse.json({ 
      message: "Organização e Admin criados com sucesso.", 
      organization: {
        id: organization?.id ?? organizationId,
        name: organization?.name ?? "Aura Core",
        slug: organization?.slug ?? "aura-core",
      },
      admin: {
        email: adminEmail,
        passwordConfigured: true,
      }
    });
  } catch (error) {
    console.error("Erro no Seed:", error);
    return NextResponse.json({ error: "Falha ao criar seed." }, { status: 500 });
  }
}
