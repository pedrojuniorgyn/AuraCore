/**
 * 🔐 AUDITORIA COMPLETA DE SEGURANÇA - AURA CORE
 * 
 * Verifica:
 * 1. Estrutura de usuários, organizações e filiais
 * 2. Sistema RBAC (Roles & Permissions)
 * 3. Audit Trail (Black Box)
 * 4. Data Scoping
 * 5. Multi-Tenancy
 * 6. Integridade referencial
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
  console.log("\n" + "═".repeat(70));
  console.log("🔐 AUDITORIA COMPLETA DE SEGURANÇA - AURA CORE");
  console.log("═".repeat(70) + "\n");

  const pool = await sql.connect(config);

  try {
    // ═══════════════════════════════════════════════════════════════
    // 1. ORGANIZAÇÕES E USUÁRIOS
    // ═══════════════════════════════════════════════════════════════
    console.log("📊 1. ORGANIZAÇÕES E USUÁRIOS\n");

    const orgs = await pool.request().query(`
      SELECT id, name, document, [plan], status, created_at 
      FROM organizations
      WHERE deleted_at IS NULL
    `);

    console.log(`   Organizações Ativas: ${orgs.recordset.length}\n`);
    orgs.recordset.forEach((o: any) => {
      console.log(`   ${o.id.toString().padStart(3)} - ${o.name.padEnd(35)} [${o.plan}] ${o.status}`);
    });

    const users = await pool.request().query(`
      SELECT id, name, email, role, organization_id, default_branch_id
      FROM users
      WHERE deleted_at IS NULL
    `);

    console.log(`\n   Usuários Ativos: ${users.recordset.length}\n`);
    users.recordset.forEach((u: any) => {
      console.log(`   ${u.name?.padEnd(30) || "SEM NOME".padEnd(30)} ${u.email.padEnd(35)} ${u.role}`);
      console.log(`      ├─ Org: ${u.organization_id} | Filial Padrão: ${u.default_branch_id || "N/A"}`);
    });

    // ═══════════════════════════════════════════════════════════════
    // 2. FILIAIS
    // ═══════════════════════════════════════════════════════════════
    console.log("\n📊 2. FILIAIS (BRANCHES)\n");

    const branches = await pool.request().query(`
      SELECT id, name, document, organization_id, environment, created_at
      FROM branches
      WHERE deleted_at IS NULL
    `);

    console.log(`   Filiais Ativas: ${branches.recordset.length}\n`);
    branches.recordset.forEach((b: any) => {
      console.log(`   ${b.id.toString().padStart(3)} - ${b.name.padEnd(45)} CNPJ: ${b.document}`);
      console.log(`      ├─ Org: ${b.organization_id} | Ambiente: ${b.environment}`);
    });

    // ═══════════════════════════════════════════════════════════════
    // 3. SISTEMA RBAC (Roles & Permissions)
    // ═══════════════════════════════════════════════════════════════
    console.log("\n📊 3. SISTEMA RBAC (Roles & Permissions)\n");

    const roles = await pool.request().query(`SELECT * FROM roles`);
    console.log(`   Roles: ${roles.recordset.length}\n`);
    roles.recordset.forEach((r: any) => {
      console.log(`   ${r.id.toString().padStart(2)} - ${r.name.padEnd(15)} ${r.description}`);
    });

    const perms = await pool.request().query(`SELECT * FROM permissions ORDER BY id`);
    console.log(`\n   Permissions: ${perms.recordset.length}\n`);
    perms.recordset.forEach((p: any) => {
      console.log(`   ${p.id.toString().padStart(2)} - ${p.slug.padEnd(30)} ${p.description}`);
    });

    const rolePerms = await pool.request().query(`
      SELECT 
        r.name as role_name,
        COUNT(*) as permission_count
      FROM role_permissions rp
      INNER JOIN roles r ON r.id = rp.role_id
      GROUP BY r.name
      ORDER BY r.name
    `);

    console.log(`\n   Permissões por Role:\n`);
    rolePerms.recordset.forEach((rp: any) => {
      console.log(`   ${rp.role_name.padEnd(15)} → ${rp.permission_count.toString().padStart(2)} permissões`);
    });

    const userRoles = await pool.request().query(`
      SELECT 
        u.email,
        r.name as role_name,
        ur.organization_id
      FROM user_roles ur
      INNER JOIN users u ON u.id = ur.user_id
      INNER JOIN roles r ON r.id = ur.role_id
    `);

    console.log(`\n   Usuários com Roles: ${userRoles.recordset.length}\n`);
    userRoles.recordset.forEach((ur: any) => {
      console.log(`   ${ur.email.padEnd(40)} → ${ur.role_name.padEnd(15)} (Org: ${ur.organization_id})`);
    });

    // ═══════════════════════════════════════════════════════════════
    // 4. DATA SCOPING (User Branches)
    // ═══════════════════════════════════════════════════════════════
    console.log("\n📊 4. DATA SCOPING (Acesso por Filial)\n");

    const userBranches = await pool.request().query(`
      SELECT 
        u.email,
        b.name as branch_name,
        ub.created_at
      FROM user_branches ub
      INNER JOIN users u ON u.id = ub.user_id
      INNER JOIN branches b ON b.id = ub.branch_id
      ORDER BY u.email
    `);

    console.log(`   Acessos configurados: ${userBranches.recordset.length}\n`);
    
    if (userBranches.recordset.length > 0) {
      userBranches.recordset.forEach((ub: any) => {
        console.log(`   ${ub.email.padEnd(40)} → ${ub.branch_name}`);
      });
    } else {
      console.log(`   ⚠️  NENHUM ACESSO POR FILIAL CONFIGURADO!`);
      console.log(`   ℹ️  Usuários podem ter acesso a TODAS as filiais da organização.`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. AUDIT TRAIL (Black Box)
    // ═══════════════════════════════════════════════════════════════
    console.log("\n📊 5. AUDIT TRAIL (Black Box - Imutável)\n");

    const auditTables = [
      { name: "audit_logs", description: "Auditoria Global" },
      { name: "chart_accounts_audit", description: "Auditoria Plano de Contas" },
      { name: "financial_categories_audit", description: "Auditoria Categorias Financeiras" },
      { name: "cost_centers_audit", description: "Auditoria Centros de Custo" },
    ];

    for (const table of auditTables) {
      try {
        const check = await pool.request().query(`
          SELECT TABLE_NAME 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = '${table.name}'
        `);

        if (check.recordset.length > 0) {
          const count = await pool.request().query(`SELECT COUNT(*) as total FROM ${table.name}`);
          const status = count.recordset[0].total > 0 ? "✅" : "⚠️ ";
          console.log(`   ${status} ${table.name.padEnd(40)} ${count.recordset[0].total.toString().padStart(6)} registros`);
          console.log(`      └─ ${table.description}`);
        } else {
          console.log(`   ❌ ${table.name.padEnd(40)} NÃO EXISTE`);
          console.log(`      └─ ${table.description}`);
        }
      } catch (e: any) {
        console.log(`   ⚠️  ${table.name.padEnd(40)} ERRO: ${e.message}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. INTEGRIDADE REFERENCIAL
    // ═══════════════════════════════════════════════════════════════
    console.log("\n📊 6. INTEGRIDADE REFERENCIAL\n");

    // Usuários sem organização (órfãos)
    const orphanUsers = await pool.request().query(`
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE o.id IS NULL AND u.deleted_at IS NULL
    `);

    console.log(`   Usuários órfãos (sem org):        ${orphanUsers.recordset[0].total === 0 ? "✅ 0" : "❌ " + orphanUsers.recordset[0].total}`);

    // Filiais sem organização
    const orphanBranches = await pool.request().query(`
      SELECT COUNT(*) as total
      FROM branches b
      LEFT JOIN organizations o ON o.id = b.organization_id
      WHERE o.id IS NULL AND b.deleted_at IS NULL
    `);

    console.log(`   Filiais órfãs (sem org):          ${orphanBranches.recordset[0].total === 0 ? "✅ 0" : "❌ " + orphanBranches.recordset[0].total}`);

    // User Roles sem usuário
    const orphanUserRoles = await pool.request().query(`
      SELECT COUNT(*) as total
      FROM user_roles ur
      LEFT JOIN users u ON u.id = ur.user_id
      WHERE u.id IS NULL
    `);

    console.log(`   User Roles órfãos (sem user):     ${orphanUserRoles.recordset[0].total === 0 ? "✅ 0" : "❌ " + orphanUserRoles.recordset[0].total}`);

    // User Roles sem role
    const orphanRoles = await pool.request().query(`
      SELECT COUNT(*) as total
      FROM user_roles ur
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE r.id IS NULL
    `);

    console.log(`   User Roles órfãos (sem role):     ${orphanRoles.recordset[0].total === 0 ? "✅ 0" : "❌ " + orphanRoles.recordset[0].total}`);

    // ═══════════════════════════════════════════════════════════════
    // 7. MULTI-TENANCY (Isolamento)
    // ═══════════════════════════════════════════════════════════════
    console.log("\n📊 7. MULTI-TENANCY (Isolamento de Dados)\n");

    const multiTenantTables = [
      "branches",
      "business_partners",
      "products",
      "fiscal_documents",
      "financial_titles",
      "audit_logs",
    ];

    for (const table of multiTenantTables) {
      try {
        const check = await pool.request().query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = 'organization_id'
        `);

        if (check.recordset.length > 0) {
          console.log(`   ✅ ${table.padEnd(40)} organization_id presente`);
        } else {
          console.log(`   ⚠️  ${table.padEnd(40)} organization_id AUSENTE`);
        }
      } catch (e) {
        console.log(`   ❓ ${table.padEnd(40)} Tabela não existe`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 8. DIAGNÓSTICO FINAL
    // ═══════════════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(70));
    console.log("📋 DIAGNÓSTICO FINAL");
    console.log("═".repeat(70) + "\n");

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Verificar audit trail
    const auditLogsCount = await pool.request().query(`SELECT COUNT(*) as total FROM audit_logs`);
    if (auditLogsCount.recordset[0].total === 0) {
      issues.push("⚠️  Tabela audit_logs está vazia - nenhuma operação sendo auditada");
      recommendations.push("Implementar logging automático de operações críticas");
    }

    // Verificar chart_accounts_audit
    try {
      const chartAuditCount = await pool.request().query(`SELECT COUNT(*) as total FROM chart_accounts_audit`);
      if (chartAuditCount.recordset[0].total === 0) {
        issues.push("⚠️  chart_accounts_audit vazia - mudanças em PCC não estão sendo auditadas");
        recommendations.push("Adicionar hooks de auditoria nas APIs de Chart of Accounts");
      }
    } catch (e) {
      issues.push("❌ Tabela chart_accounts_audit NÃO EXISTE");
      recommendations.push("Criar tabela chart_accounts_audit conforme schema");
    }

    // Verificar data scoping
    if (userBranches.recordset.length === 0) {
      issues.push("⚠️  Nenhum usuário tem Data Scoping configurado");
      recommendations.push("Configurar user_branches para controle granular de acesso");
    }

    // Exibir issues
    if (issues.length > 0) {
      console.log("🚨 PROBLEMAS IDENTIFICADOS:\n");
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    } else {
      console.log("✅ NENHUM PROBLEMA CRÍTICO IDENTIFICADO\n");
    }

    // Exibir recomendações
    if (recommendations.length > 0) {
      console.log("\n💡 RECOMENDAÇÕES:\n");
      recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    console.log("\n" + "═".repeat(70));
    console.log("✅ AUDITORIA CONCLUÍDA");
    console.log("═".repeat(70) + "\n");

  } catch (error: any) {
    console.error("\n❌ ERRO:", error.message);
    throw error;
  } finally {
    await pool.close();
  }
}

run().catch(console.error);
