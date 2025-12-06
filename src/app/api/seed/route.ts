import { getDb } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Garante que a conexão está estabelecida
    const db = await getDb();

    // Verifica se já existe alguma organização
    const allOrgs = await db
      .select()
      .from(organizations);
    
    const existingOrg = allOrgs[0];

    if (existingOrg) {
      return NextResponse.json({ message: "Seed já realizado ou banco não está vazio." });
    }

    // 1. Cria a Organização Principal
    const [organization] = await db.insert(organizations).values({
      name: "Aura Core",
      slug: "aura-core",
      document: "00000000000000", // CNPJ de exemplo - TROQUE pelo real
      plan: "ENTERPRISE",
      status: "ACTIVE",
    }).returning();

    // 2. Dados do Admin Inicial
    const adminEmail = "admin@auracore.com"; // TROQUE pelo seu email real se quiser testar Google Link
    const adminPassword = "admin"; // TROQUE IMEDIATAMENTE

    const passwordHash = await hash(adminPassword, 10);

    // 3. Cria Admin com organizationId
    await db.insert(users).values({
      name: "Admin Aura",
      email: adminEmail,
      passwordHash: passwordHash,
      role: "ADMIN",
      image: "",
      organizationId: organization.id,
    });

    return NextResponse.json({ 
      message: "Organização e Admin criados com sucesso.", 
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      admin: {
        email: adminEmail, 
        password: adminPassword 
      }
    });
  } catch (error) {
    console.error("Erro no Seed:", error);
    return NextResponse.json({ error: "Falha ao criar seed." }, { status: 500 });
  }
}
