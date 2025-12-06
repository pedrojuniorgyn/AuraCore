import * as dotenv from "dotenv";
dotenv.config();

import { db, pool } from "../src/lib/db";
import { users, branches, organizations, userBranches, businessPartners } from "../src/lib/db/schema";
import { hash } from "bcryptjs";
import { eq, isNull } from "drizzle-orm";

async function main() {
  try {
    console.log("🚀 Iniciando Seed do AuraCore (Enterprise SaaS Multi-Tenant)...\n");

    if (!pool.connected) {
      console.log("📡 Conectando ao banco...");
      await pool.connect();
      console.log("✅ Conectado!\n");
    }

    // ========================================
    // 1. CRIAR ORGANIZAÇÃO (TENANT) - ID 1
    // ========================================
    console.log("🏢 Verificando Organização...");
    
    const existingOrgs = await db
      .select()
      .from(organizations)
      .where(isNull(organizations.deletedAt)); // Apenas organizações ativas (não deletadas)

    let organizationId = 1;

    if (existingOrgs.length === 0) {
      console.log("📦 Criando Organização 'AuraCore HQ'...");
      
      await db.insert(organizations).values({
        name: "AURACORE LOGÍSTICA LTDA", // TROQUE pelo nome da sua empresa
        slug: "auracore-hq", // URL amigável (único no sistema)
        document: "00000000000191", // CNPJ da organização (TROQUE)
        plan: "ENTERPRISE", // Plano inicial
        stripeCustomerId: null,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        version: 1,
      });

      const [newOrg] = await db.select().from(organizations);
      organizationId = newOrg.id;

      console.log(`✅ Organização criada (ID ${organizationId})\n`);
    } else {
      organizationId = existingOrgs[0].id;
      console.log(`✅ Organização já existe (ID ${organizationId})\n`);
    }

    // ========================================
    // 2. CRIAR BRANCH MATRIZ - Vinculada à Org
    // ========================================
    console.log("🏢 Verificando Branch Matriz...");
    
    const existingBranches = await db
      .select()
      .from(branches)
      .where(eq(branches.organizationId, organizationId));

    let matrizBranchId = 1;

    if (existingBranches.length === 0) {
      console.log("📦 Criando Branch Matriz...");
      
      await db.insert(branches).values({
        organizationId: organizationId, // 🔑 VÍNCULO MULTI-TENANT
        name: "AURACORE LOGÍSTICA LTDA - MATRIZ", // TROQUE
        tradeName: "AuraCore Matriz",
        document: "00000000000191", // CNPJ (TROQUE)
        email: "matriz@auracore.com.br",
        phone: "(11) 3000-0000",
        
        // Fiscal
        ie: "123456789", // TROQUE
        im: "123456",
        cClassTrib: "01",
        crt: "1", // 1=Simples Nacional
        
        // Endereço (TROQUE pelos dados reais)
        zipCode: "01310100",
        street: "Avenida Paulista",
        number: "1000",
        complement: "Sala 100",
        district: "Bela Vista",
        cityCode: "3550308", // São Paulo/SP
        cityName: "São Paulo",
        state: "SP",
        
        // Config
        timeZone: "America/Sao_Paulo",
        logoUrl: "",
        
        // Enterprise Base
        createdBy: null, // Sistema criou (não tem usuário ainda)
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        version: 1,
        status: "ACTIVE",
      });

      // Busca a branch criada para pegar o ID
      const [matrizBranch] = await db
        .select()
        .from(branches)
        .where(eq(branches.organizationId, organizationId));
      
      matrizBranchId = matrizBranch.id;
      console.log(`✅ Branch Matriz criada (ID ${matrizBranchId})\n`);
    } else {
      matrizBranchId = existingBranches[0].id;
      console.log(`✅ Branch Matriz já existe (ID ${matrizBranchId})\n`);
    }

    // ========================================
    // 3. CRIAR USUÁRIO ADMIN - Vinculado à Org
    // ========================================
    console.log("👤 Verificando Usuário Admin...");
    
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId));

    let adminUserId = "";

    if (existingUsers.length === 0) {
      console.log("📦 Criando usuário Admin...");
      
      const adminEmail = "admin@auracore.com"; // TROQUE
      const adminPassword = "admin@2024"; // TROQUE IMEDIATAMENTE

      const passwordHash = await hash(adminPassword, 10);

      // Cria o usuário Admin com filial padrão = Matriz
      adminUserId = crypto.randomUUID();
      
      await db.insert(users).values({
        id: adminUserId,
        organizationId: organizationId, // 🔑 VÍNCULO MULTI-TENANT
        name: "Administrador AuraCore",
        email: adminEmail,
        passwordHash: passwordHash,
        role: "ADMIN",
        defaultBranchId: matrizBranchId, // 🏢 Filial padrão ao logar
        image: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      // Vincula o Admin à Branch Matriz (Data Scoping)
      await db.insert(userBranches).values({
        userId: adminUserId,
        branchId: matrizBranchId,
        createdAt: new Date(),
      });

      console.log("✅ Admin criado com sucesso\n");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📧 Email:", adminEmail);
      console.log("🔑 Senha:", adminPassword);
      console.log(`🏢 Filial Padrão: Matriz (ID ${matrizBranchId})`);
      console.log("⚠️  ATENÇÃO: Troque a senha após o primeiro login!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    } else {
      adminUserId = existingUsers[0].id;
      console.log("✅ Usuário Admin já existe\n");
    }

    // ========================================
    // 4. CRIAR PARCEIRO DE NEGÓCIO DE EXEMPLO
    // ========================================
    console.log("🤝 Verificando Parceiros de Negócio...");
    
    const existingPartners = await db
      .select()
      .from(businessPartners)
      .where(eq(businessPartners.organizationId, organizationId));

    if (existingPartners.length === 0) {
      console.log("📦 Criando parceiro de exemplo...");
      
      await db.insert(businessPartners).values({
        organizationId: organizationId,
        type: "CLIENT",
        document: "12345678000190",
        name: "Cliente Exemplo Ltda",
        tradeName: "Cliente Exemplo",
        email: "exemplo@cliente.com.br",
        phone: "(11) 98888-8888",
        dataSource: "MANUAL",
        taxRegime: "SIMPLE",
        ie: "ISENTO",
        indIeDest: "9",
        zipCode: "01310100",
        street: "Avenida Paulista",
        number: "1500",
        district: "Bela Vista",
        cityCode: "3550308",
        cityName: "São Paulo",
        state: "SP",
        
        // Enterprise Base
        createdBy: adminUserId, // Admin criou
        updatedBy: adminUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        version: 1,
        status: "ACTIVE",
      });

      console.log("✅ Parceiro de exemplo criado\n");
    } else {
      console.log("✅ Parceiros já existem\n");
    }

    // ========================================
    // RESUMO FINAL
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SEED CONCLUÍDO - ENTERPRISE BASE APLICADO!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📊 Status:");
    console.log(`   Organizações: ${existingOrgs.length > 0 ? existingOrgs.length : 1}`);
    console.log(`   Branches: ${existingBranches.length > 0 ? existingBranches.length : 1}`);
    console.log(`   Usuários: ${existingUsers.length > 0 ? existingUsers.length : 1}`);
    console.log(`   Parceiros: ${existingPartners.length > 0 ? existingPartners.length : 1}`);
    console.log("\n🔐 Enterprise Base Aplicado:");
    console.log("   ✅ Multi-Tenant (organization_id)");
    console.log("   ✅ Data Scoping (user_branches)");
    console.log("   ✅ Auditoria (created_by/updated_by)");
    console.log("   ✅ Soft Delete (deleted_at)");
    console.log("   ✅ Optimistic Locking (version)");
    console.log("\n🚀 Próximos Passos:");
    console.log("   1. Execute: npm run dev");
    console.log("   2. Acesse: http://localhost:3000/login");
    console.log("   3. O sistema está pronto para produção SaaS!");
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro no Seed:", error);
    process.exit(1);
  }
}

main();
