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
  server: process.env.DB_HOST || "vpsw4722.publiccloud.com.br",
  database: process.env.DB_NAME as string,
  options: { encrypt: false, trustServerCertificate: true },
  port: 1433,
};

async function run() {
  console.log("\n🔐 SEED: Permissões e Roles\n");

  const pool = await sql.connect(config);

  try {
    // 1. Verificar se já tem dados
    const check = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM permissions) as permissions,
        (SELECT COUNT(*) FROM role_permissions) as role_permissions,
        (SELECT COUNT(*) FROM user_roles) as user_roles
    `);

    console.log("📊 Estado atual:");
    console.log(`   Permissions: ${check.recordset[0].permissions}`);
    console.log(`   Role-Permissions: ${check.recordset[0].role_permissions}`);
    console.log(`   User-Roles: ${check.recordset[0].user_roles}\n`);

    // 2. Seed Permissions (se vazio)
    if (check.recordset[0].permissions === 0) {
      console.log("📝 Criando permissões básicas...");
      
      const permissions = [
        { slug: 'admin.full', desc: 'Acesso total de administrador' },
        { slug: 'users.view', desc: 'Visualizar usuários' },
        { slug: 'users.create', desc: 'Criar usuários' },
        { slug: 'users.edit', desc: 'Editar usuários' },
        { slug: 'users.delete', desc: 'Deletar usuários' },
        { slug: 'financial.view', desc: 'Visualizar financeiro' },
        { slug: 'financial.create', desc: 'Criar títulos financeiros' },
        { slug: 'fiscal.view', desc: 'Visualizar documentos fiscais' },
        { slug: 'fiscal.emit', desc: 'Emitir documentos fiscais' },
        { slug: 'fleet.view', desc: 'Visualizar frota' },
        { slug: 'fleet.manage', desc: 'Gerenciar frota' },
      ];

      for (const p of permissions) {
        await pool.request()
          .input('slug', sql.NVarChar, p.slug)
          .input('desc', sql.NVarChar, p.desc)
          .query(`
            INSERT INTO permissions (slug, description, created_at, updated_at)
            VALUES (@slug, @desc, GETDATE(), GETDATE())
          `);
      }
      
      console.log(`   ✅ ${permissions.length} permissões criadas\n`);
    }

    // 3. Seed Role-Permissions (Role ID 1 = ADMIN tem todas as permissões)
    if (check.recordset[0].role_permissions === 0) {
      console.log("🔗 Vinculando permissões ao role ADMIN...");
      
      const allPermissions = await pool.request().query(`
        SELECT id FROM permissions
      `);

      for (const p of allPermissions.recordset) {
        await pool.request()
          .input('roleId', sql.Int, 1) // Role ADMIN
          .input('permId', sql.Int, p.id)
          .query(`
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (@roleId, @permId)
          `);
      }
      
      console.log(`   ✅ ${allPermissions.recordset.length} permissões vinculadas ao ADMIN\n`);
    }

    // 4. Seed User-Roles (vincular admin@tcltransporte.com.br ao role ADMIN)
    if (check.recordset[0].user_roles === 0) {
      console.log("👤 Vinculando usuário admin ao role ADMIN...");
      
      // Buscar ID do usuário admin
      const adminUser = await pool.request()
        .input('email', sql.NVarChar, 'admin@tcltransporte.com.br')
        .query(`
          SELECT id FROM users WHERE email = @email
        `);

      if (adminUser.recordset.length > 0) {
        const userId = adminUser.recordset[0].id;
        
        await pool.request()
          .input('userId', sql.NVarChar, userId)
          .input('roleId', sql.Int, 1) // Role ADMIN
          .input('orgId', sql.Int, 1)
          .query(`
            INSERT INTO user_roles (user_id, role_id, organization_id, created_at)
            VALUES (@userId, @roleId, @orgId, GETDATE())
          `);
        
        console.log(`   ✅ Usuário admin vinculado ao role ADMIN\n`);
      } else {
        console.log(`   ⚠️  Usuário admin@tcltransporte.com.br não encontrado\n`);
      }
    }

    // 5. Verificar resultado final
    const final = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM permissions) as permissions,
        (SELECT COUNT(*) FROM role_permissions) as role_permissions,
        (SELECT COUNT(*) FROM user_roles) as user_roles
    `);

    console.log("✅ RESULTADO FINAL:");
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
