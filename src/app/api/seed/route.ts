import { getDb, ensureConnection } from "@/lib/db";
import { branches, organizations, permissions, rolePermissions, roles, userBranches, userRoles, users } from "@/lib/db/schema";
import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

function seedIsEnabled() {
  // Segurança: OFF por padrão (ADR0004 style). Em produção, exige token.
  if (process.env.SEED_HTTP_ENABLED !== "true") return false;
  if (process.env.NODE_ENV === "production") {
    return Boolean(process.env.SEED_HTTP_TOKEN);
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    if (!seedIsEnabled()) {
      // 404 para não “anunciar” endpoint operacional
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Autorização: token (preferencial). Em produção é obrigatório.
    const seedToken = process.env.SEED_HTTP_TOKEN;
    const headerToken = req.headers.get("x-seed-token");
    const tokenOk = seedToken && headerToken && headerToken === seedToken;
    if (!tokenOk) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // Em dev/homolog: fallback por sessão admin
      const ctx = await getTenantContext();
      if (!ctx.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Garante que a conexão está estabelecida
    const db = await getDb();
    const pool = await ensureConnection();

    // Garantir tabelas pivot críticas (idempotente) — evita ambientes "meio migrados"
    await pool.request().query(`
      IF OBJECT_ID(N'dbo.user_roles', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.user_roles (
          user_id NVARCHAR(255) NOT NULL,
          role_id INT NOT NULL,
          organization_id INT NOT NULL,
          branch_id INT NULL,
          created_at DATETIME2 NULL CONSTRAINT DF_user_roles_created_at DEFAULT (GETDATE()),
          CONSTRAINT PK_user_roles PRIMARY KEY (user_id, role_id)
        );
      END
    `);

    await pool.request().query(`
      IF OBJECT_ID(N'dbo.user_branches', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.user_branches (
          user_id NVARCHAR(255) NOT NULL,
          branch_id INT NOT NULL,
          created_at DATETIME2 NULL CONSTRAINT DF_user_branches_created_at DEFAULT (GETDATE()),
          CONSTRAINT PK_user_branches PRIMARY KEY (user_id, branch_id)
        );
      END
    `);

    // ----------------------------
    // 1) Organização (idempotente)
    // ----------------------------
    const orgSlug = (process.env.SEED_ORG_SLUG || "aura-core").trim();
    const orgName = (process.env.SEED_ORG_NAME || "Aura Core").trim();
    const orgDocument = (process.env.SEED_ORG_DOCUMENT || "00000000000000").trim();

    let organizationId: number | null = null;
    const existingBySlug = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.slug, orgSlug), isNull(organizations.deletedAt)))
      .limit(1);

    if (existingBySlug.length > 0) {
      organizationId = existingBySlug[0].id;
    } else {
      const [anyOrg] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(isNull(organizations.deletedAt))
        .limit(1);
      organizationId = anyOrg?.id ?? null;
    }

    if (!organizationId) {
      const [{ id }] = await db
        .insert(organizations)
        .values({
          name: orgName,
          slug: orgSlug,
          document: orgDocument,
          plan: "ENTERPRISE",
          status: "ACTIVE",
        })
        .$returningId();
      organizationId = id;
    }

    // ----------------------------
    // 2) RBAC (idempotente)
    // ----------------------------
    const [adminRoleRow] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, "ADMIN"))
      .limit(1);

    let adminRoleId = adminRoleRow?.id ?? null;
    if (!adminRoleId) {
      const [{ id }] = await db
        .insert(roles)
        .values({
          name: "ADMIN",
          description: "Administrador do sistema (acesso total)",
        })
        .$returningId();
      adminRoleId = id;
    }

    const desiredPermissions = [
      { slug: "admin.full", description: "Acesso total de administrador" },
      { slug: "admin.users.manage", description: "Gerenciar usuários (admin)" },
    ] as const;

    for (const p of desiredPermissions) {
      const exists = await db
        .select({ id: permissions.id })
        .from(permissions)
        .where(eq(permissions.slug, p.slug))
        .limit(1);
      if (exists.length === 0) {
        await db.insert(permissions).values({
          slug: p.slug,
          description: p.description,
        });
      }
    }

    // Vincular todas as permissões existentes ao role ADMIN (idempotente)
    const allPerms = await db.select({ id: permissions.id }).from(permissions);
    for (const perm of allPerms) {
      const linkExists = await db
        .select({ roleId: rolePermissions.roleId })
        .from(rolePermissions)
        .where(and(eq(rolePermissions.roleId, adminRoleId), eq(rolePermissions.permissionId, perm.id)))
        .limit(1);
      if (linkExists.length === 0) {
        await db.insert(rolePermissions).values({
          roleId: adminRoleId,
          permissionId: perm.id,
        });
      }
    }

    // ----------------------------
    // 3) Filial Matriz (idempotente)
    // ----------------------------
    const matrizDocument = (process.env.SEED_MATRIZ_DOCUMENT || "00000000000000").trim();
    const matrizName = (process.env.SEED_MATRIZ_NAME || orgName).trim();
    const matrizTradeName = (process.env.SEED_MATRIZ_TRADE_NAME || orgName).trim();
    const matrizEmail = (process.env.SEED_MATRIZ_EMAIL || "contato@auracore.com").trim();
    const matrizPhone = (process.env.SEED_MATRIZ_PHONE || "0000000000").trim();
    const matrizIE = (process.env.SEED_MATRIZ_IE || "ISENTO").trim();
    const matrizZip = (process.env.SEED_MATRIZ_ZIP || "00000-000").trim();
    const matrizStreet = (process.env.SEED_MATRIZ_STREET || "Rua Matriz").trim();
    const matrizNumber = (process.env.SEED_MATRIZ_NUMBER || "0").trim();
    const matrizDistrict = (process.env.SEED_MATRIZ_DISTRICT || "Centro").trim();
    const matrizCityCode = (process.env.SEED_MATRIZ_CITY_CODE || "0000000").trim();
    const matrizCityName = (process.env.SEED_MATRIZ_CITY_NAME || "Cidade").trim();
    const matrizState = (process.env.SEED_MATRIZ_STATE || "SP").trim();

    let matrizBranchId: number | null = null;
    const existingMatriz = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.organizationId, organizationId), eq(branches.document, matrizDocument), isNull(branches.deletedAt)))
      .limit(1);

    if (existingMatriz.length > 0) {
      matrizBranchId = existingMatriz[0].id;
    } else {
      await db.insert(branches).values({
        organizationId,
        name: matrizName,
        tradeName: matrizTradeName,
        document: matrizDocument,
        email: matrizEmail,
        phone: matrizPhone,
        ie: matrizIE,
        crt: "1",
        zipCode: matrizZip,
        street: matrizStreet,
        number: matrizNumber,
        district: matrizDistrict,
        cityCode: matrizCityCode,
        cityName: matrizCityName,
        state: matrizState,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        version: 1,
        status: "ACTIVE",
      });

      const [created] = await db
        .select({ id: branches.id })
        .from(branches)
        .where(and(eq(branches.organizationId, organizationId), eq(branches.document, matrizDocument)))
        .orderBy(desc(branches.id))
        .limit(1);
      matrizBranchId = created?.id ?? null;
    }

    // ----------------------------
    // 4) Admin (idempotente)
    // ----------------------------
    const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@auracore.com").trim().toLowerCase();
    const adminName = (process.env.SEED_ADMIN_NAME || "Admin Aura").trim();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json(
        { error: "Defina SEED_ADMIN_PASSWORD no ambiente para executar o seed." },
        { status: 400 }
      );
    }
    const passwordHash = await hash(adminPassword, 10);

    let adminUserId: string | null = null;
    const existingAdmin = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.email, adminEmail), isNull(users.deletedAt)))
      .limit(1);

    if (existingAdmin.length > 0) {
      adminUserId = existingAdmin[0].id;

      // Atualiza papel/branch e (se necessário) senha
      const shouldResetPassword =
        req.headers.get("x-seed-reset-password") === "1" || !existingAdmin[0].passwordHash;
      await db
        .update(users)
        .set({
          name: adminName,
          role: "ADMIN",
          defaultBranchId: matrizBranchId ?? null,
          ...(shouldResetPassword ? { passwordHash } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, adminUserId));
    } else {
      await db.insert(users).values({
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
        image: "",
        organizationId,
        defaultBranchId: matrizBranchId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const [createdUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.organizationId, organizationId), eq(users.email, adminEmail), isNull(users.deletedAt)))
        .limit(1);
      adminUserId = createdUser?.id ?? null;
    }

    if (!adminUserId) {
      return NextResponse.json({ error: "Falha ao garantir usuário admin." }, { status: 500 });
    }

    // user_roles (RBAC) para o admin
    const urExists = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, adminUserId),
          eq(userRoles.roleId, adminRoleId),
          eq(userRoles.organizationId, organizationId)
        )
      )
      .limit(1);

    if (urExists.length === 0) {
      await db.insert(userRoles).values({
        userId: adminUserId,
        roleId: adminRoleId,
        organizationId,
        branchId: matrizBranchId ?? null,
        createdAt: new Date(),
      });
    }

    // user_branches (Data Scoping) para o admin
    if (matrizBranchId) {
      const ubExists = await db
        .select({ userId: userBranches.userId })
        .from(userBranches)
        .where(and(eq(userBranches.userId, adminUserId), eq(userBranches.branchId, matrizBranchId)))
        .limit(1);
      if (ubExists.length === 0) {
        await db.insert(userBranches).values({
          userId: adminUserId,
          branchId: matrizBranchId,
          createdAt: new Date(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Bootstrap concluído (org + RBAC + matriz + admin).",
      organization: { id: organizationId, slug: orgSlug, name: orgName, document: orgDocument },
      matriz: matrizBranchId
        ? { id: matrizBranchId, document: matrizDocument, name: matrizName }
        : { created: false },
      admin: {
        email: adminEmail,
        passwordConfigured: true,
        defaultBranchId: matrizBranchId,
      },
      notes: [
        "Em produção, este endpoint exige SEED_HTTP_ENABLED=true e SEED_HTTP_TOKEN + header x-seed-token.",
        "Use header x-seed-reset-password: 1 para forçar reset da senha do admin.",
      ],
    });
  } catch (error) {
    console.error("Erro no Seed:", error);
    return NextResponse.json({ error: "Falha ao criar seed." }, { status: 500 });
  }
}
