/**
 * SEED: Permissões e Roles Básicos
 * 
 * Popula as tabelas:
 * - permissions (permissões do sistema)
 * - role_permissions (vincula roles com permissões)
 * - user_roles (vincula usuários com roles)
 */

import dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  server: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME as string,
  options: {
    encrypt: (process.env.DB_ENCRYPT ?? "false") === "true",
    trustServerCertificate: (process.env.DB_TRUST_CERT ?? "true") === "true",
    enableArithAbort: true,
  },
  port: Number(process.env.DB_PORT ?? "1433"),
};

async function run() {
  console.log("\n🔐 SEED: Permissões e Roles\n");

  const pool = await sql.connect(config);

  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@auracore.com";

    // 1. Estado atual
    const check = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM roles) as roles,
        (SELECT COUNT(*) FROM permissions) as permissions,
        (SELECT COUNT(*) FROM role_permissions) as role_permissions,
        (SELECT COUNT(*) FROM user_roles) as user_roles
    `);

    console.log("📊 Estado atual:");
    console.log(`   Roles: ${check.recordset[0].roles}`);
    console.log(`   Permissions: ${check.recordset[0].permissions}`);
    console.log(`   Role-Permissions: ${check.recordset[0].role_permissions}`);
    console.log(`   User-Roles: ${check.recordset[0].user_roles}\n`);

    // 2. Garantir role ADMIN
    console.log("🧩 Garantindo role ADMIN...");
    const roleRow = await pool.request()
      .input("roleName", sql.NVarChar, "ADMIN")
      .query(`SELECT id FROM roles WHERE name = @roleName`);

    let adminRoleId: number;
    if (roleRow.recordset.length === 0) {
      const inserted = await pool.request()
        .input("roleName", sql.NVarChar, "ADMIN")
        .input("roleDesc", sql.NVarChar, "Administrador do sistema (acesso total)")
        .query(`
          INSERT INTO roles (name, description, created_at, updated_at)
          OUTPUT INSERTED.id as id
          VALUES (@roleName, @roleDesc, GETDATE(), GETDATE())
        `);
      adminRoleId = inserted.recordset[0].id;
      console.log(`   ✅ Role ADMIN criado (id=${adminRoleId})`);
    } else {
      adminRoleId = roleRow.recordset[0].id;
      console.log(`   ✅ Role ADMIN já existe (id=${adminRoleId})`);
    }

    // 3. Garantir permissões mínimas (inclui as usadas por withPermission hoje)
    console.log("\n📝 Garantindo permissões...");
    const desiredPermissions = [
      { slug: "admin.full", desc: "Acesso total de administrador" },
      { slug: "admin.users.manage", desc: "Gerenciar usuários (admin)" },
      { slug: "fiscal.cte.create", desc: "Criar/emitir CTe" },
      { slug: "fiscal.cte.cancel", desc: "Cancelar CTe" },
      { slug: "fiscal.cte.authorize", desc: "Autorizar CTe" },
      { slug: "financial.billing.create", desc: "Criar cobrança/faturamento" },
      { slug: "financial.billing.approve", desc: "Aprovar/finalizar cobrança" },
    ];

    for (const p of desiredPermissions) {
      await pool.request()
        .input("slug", sql.NVarChar, p.slug)
        .input("desc", sql.NVarChar, p.desc)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM permissions WHERE slug = @slug)
          BEGIN
            INSERT INTO permissions (slug, description, created_at, updated_at)
            VALUES (@slug, @desc, GETDATE(), GETDATE())
          END
        `);
    }
    console.log(`   ✅ OK (${desiredPermissions.length} permissões garantidas)`);

    // 4. Vincular TODAS as permissões existentes ao role ADMIN (idempotente)
    console.log("\n🔗 Garantindo role_permissions do ADMIN (todas as permissões)...");
    await pool.request()
      .input("roleId", sql.Int, adminRoleId)
      .query(`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT @roleId, p.id
        FROM permissions p
        WHERE NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = @roleId AND rp.permission_id = p.id
        )
      `);
    console.log("   ✅ Role ADMIN vinculado a todas as permissões existentes");

    // 5. Vincular admin@auracore.com ao role ADMIN (idempotente) usando organization_id real do usuário
    console.log(`\n👤 Garantindo user_roles para ${adminEmail}...`);
    const adminUser = await pool.request()
      .input("email", sql.NVarChar, adminEmail)
      .query(`
        SELECT id, organization_id
        FROM users
        WHERE email = @email
          AND deleted_at IS NULL
      `);

    if (adminUser.recordset.length === 0) {
      console.log(`   ⚠️  Usuário ${adminEmail} não encontrado na tabela users`);
    } else {
      const userId = adminUser.recordset[0].id as string;
      const orgId = adminUser.recordset[0].organization_id as number;

      await pool.request()
        .input("userId", sql.NVarChar, userId)
        .input("roleId", sql.Int, adminRoleId)
        .input("orgId", sql.Int, orgId)
        .query(`
          IF NOT EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = @userId AND role_id = @roleId AND organization_id = @orgId
          )
          BEGIN
            INSERT INTO user_roles (user_id, role_id, organization_id, created_at)
            VALUES (@userId, @roleId, @orgId, GETDATE())
          END
        `);

      console.log(`   ✅ Usuário vinculado ao role ADMIN (org=${orgId})`);
    }

    // 5. Verificar resultado final
    const final = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM roles) as roles,
        (SELECT COUNT(*) FROM permissions) as permissions,
        (SELECT COUNT(*) FROM role_permissions) as role_permissions,
        (SELECT COUNT(*) FROM user_roles) as user_roles
    `);

    console.log("✅ RESULTADO FINAL:");
    console.log(`   Roles: ${final.recordset[0].roles}`);
    console.log(`   Permissions: ${final.recordset[0].permissions}`);
    console.log(`   Role-Permissions: ${final.recordset[0].role_permissions}`);
    console.log(`   User-Roles: ${final.recordset[0].user_roles}\n`);

    if (final.recordset[0].permissions > 0 && 
        final.recordset[0].role_permissions > 0 && 
        final.recordset[0].user_roles > 0) {
      console.log("🎉 Sistema de permissões populado com sucesso!\n");
    }

  } catch (error: any) {
    console.error("\n❌ ERRO:", error.message);
    throw error;
  } finally {
    await pool.close();
  }
}

run().catch(console.error);
