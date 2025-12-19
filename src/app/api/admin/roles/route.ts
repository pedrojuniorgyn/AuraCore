import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { permissions, rolePermissions, roles } from "@/lib/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";

async function ensureDefaultRoles() {
  // Roles globais (não são por organização) — idempotente.
  // Objetivo: garantir que a UI de usuários consiga selecionar perfis além de ADMIN.
  const desired = [
    { name: "ADMIN", description: "Administrador do sistema (acesso total)" },
    { name: "MANAGER", description: "Gestão operacional/financeira (perfil gerente)" },
    { name: "OPERATOR", description: "Operação do dia a dia (perfil operador)" },
    { name: "AUDITOR", description: "Acesso de leitura para auditoria/relatórios" },
  ] as const;

  const existing = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(inArray(roles.name, desired.map((d) => d.name)));

  const existingNames = new Set(existing.map((r) => r.name));
  const missing = desired.filter((d) => !existingNames.has(d.name));
  if (missing.length === 0) return;

  // Inserir os que faltam
  for (const r of missing) {
    await db.insert(roles).values({
      name: r.name,
      description: r.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Garantir que ADMIN sempre tenha descrição consistente (sem sobrescrever customizações)
  const admin = await db.select({ id: roles.id, description: roles.description }).from(roles).where(eq(roles.name, "ADMIN"));
  if (admin.length > 0 && !admin[0].description) {
    await db.update(roles).set({ description: "Administrador do sistema (acesso total)", updatedAt: new Date() }).where(eq(roles.name, "ADMIN"));
  }
}

async function ensureDefaultRolePermissions() {
  // Garante permissão base do módulo Auditoria existir
  const desiredPerms = [
    { slug: "audit.read", description: "Visualizar auditoria/snapshots" },
  ] as const;

  for (const p of desiredPerms) {
    const exists = await db.select({ id: permissions.id }).from(permissions).where(eq(permissions.slug, p.slug));
    if (exists.length === 0) {
      await db.insert(permissions).values({ slug: p.slug, description: p.description });
    }
  }

  const [auditRead] = await db.select({ id: permissions.id }).from(permissions).where(eq(permissions.slug, "audit.read"));
  if (!auditRead?.id) return;

  // Vincular AUDITOR -> audit.read (idempotente)
  const [auditorRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, "AUDITOR"));
  if (auditorRole?.id) {
    const link = await db
      .select({ roleId: rolePermissions.roleId })
      .from(rolePermissions)
      .where(and(eq(rolePermissions.roleId, auditorRole.id), eq(rolePermissions.permissionId, auditRead.id)));
    if (link.length === 0) {
      await db.insert(rolePermissions).values({ roleId: auditorRole.id, permissionId: auditRead.id });
    }
  }
}

/**
 * GET /api/admin/roles
 * 🔐 Requer permissão: admin.users.manage
 */
export async function GET(request: NextRequest) {
  return withPermission(request, "admin.users.manage", async (_user, _ctx) => {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    await ensureDefaultRoles();
    await ensureDefaultRolePermissions();

    const data = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
      })
      .from(roles)
      .orderBy(asc(roles.name));

    return NextResponse.json({ success: true, data });
  });
}


