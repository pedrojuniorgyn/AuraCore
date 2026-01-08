import { db, ensureConnection } from "../src/lib/db";
import { financialCategories, bankAccounts } from "../src/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Seed de Dados Financeiros
 * 
 * Popula categorias e contas bancárias padrão
 */

const DEFAULT_CATEGORIES = {
  INCOME: [
    { name: "Venda de Frete", code: "1.01" },
    { name: "Venda de Produto", code: "1.02" },
    { name: "Prestação de Serviços", code: "1.03" },
    { name: "Outras Receitas", code: "1.99" },
  ],
  EXPENSE: [
    { name: "Fornecedores (NFe)", code: "2.01", description: "Compras via NFe" },
    { name: "Combustível", code: "2.02", description: "Combustível e abastecimento" },
    { name: "Manutenção", code: "2.03", description: "Manutenção de veículos" },
    { name: "Administrativo", code: "2.04", description: "Despesas administrativas" },
    { name: "Impostos e Taxas", code: "2.05", description: "Impostos e contribuições" },
    { name: "Salários", code: "2.06", description: "Folha de pagamento" },
    { name: "Água, Luz, Telefone", code: "2.07", description: "Contas de consumo" },
    { name: "Aluguel", code: "2.08", description: "Aluguel de imóveis" },
    { name: "Outras Despesas", code: "2.99", description: "Outras despesas" },
  ],
};

const DEFAULT_BANK_ACCOUNTS = [
  { name: "Caixa", bankCode: "000", bankName: "Caixa Geral", accountType: "CASH", initialBalance: 1000 },
  { name: "Banco Principal", bankCode: "001", bankName: "Banco do Brasil", accountType: "CHECKING", initialBalance: 10000 },
];

async function seedFinancialData() {
  try {
    console.log("📡 Conectando ao banco...");
    await ensureConnection();
    console.log("✅ Conectado!\n");

    const organizationId = 1;
    const userId = "system";
    let totalCreated = 0;

    console.log(`🌱 Seed financeiro para org ${organizationId}...\n`);

    // === CATEGORIAS ===
    const existingCats = await db
      .select()
      .from(financialCategories)
      .where(
        and(
          eq(financialCategories.organizationId, organizationId),
          isNull(financialCategories.deletedAt)
        )
      );

    if (existingCats.length === 0) {
      console.log("💰 Criando categorias de RECEITA...");
      for (const cat of DEFAULT_CATEGORIES.INCOME) {
        await db.insert(financialCategories).values({
          organizationId,
          name: cat.name,
          code: cat.code,
          type: "INCOME",
          status: "ACTIVE",
          createdBy: userId,
          updatedBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        });
        console.log(`  ✅ ${cat.code} - ${cat.name}`);
        totalCreated++;
      }

      console.log("\n💸 Criando categorias de DESPESA...");
      for (const cat of DEFAULT_CATEGORIES.EXPENSE) {
        await db.insert(financialCategories).values({
          organizationId,
          name: cat.name,
          code: cat.code,
          type: "EXPENSE",
          description: cat.description || null,
          status: "ACTIVE",
          createdBy: userId,
          updatedBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        });
        console.log(`  ✅ ${cat.code} - ${cat.name}`);
        totalCreated++;
      }
    } else {
      console.log(`⚠️  ${existingCats.length} categorias já existem.`);
    }

    // === CONTAS BANCÁRIAS ===
    const existingBanks = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.organizationId, organizationId),
          isNull(bankAccounts.deletedAt)
        )
      );

    if (existingBanks.length === 0) {
      console.log("\n🏦 Criando contas bancárias...");
      for (const bank of DEFAULT_BANK_ACCOUNTS) {
        await db.insert(bankAccounts).values({
          organizationId,
          branchId: 1,
          name: bank.name,
          bankCode: bank.bankCode,
          bankName: bank.bankName,
          accountType: bank.accountType,
          initialBalance: bank.initialBalance.toString(),
          currentBalance: bank.initialBalance.toString(),
          status: "ACTIVE",
          createdBy: userId,
          updatedBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        });
        console.log(`  ✅ ${bank.name} - Saldo: R$ ${bank.initialBalance.toFixed(2)}`);
        totalCreated++;
      }
    } else {
      console.log(`\n⚠️  ${existingBanks.length} contas bancárias já existem.`);
    }

    console.log(`\n🎉 Seed concluído! ${totalCreated} registros criados.`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n❌ Erro no seed:", message);
    throw error;
  }
}

// Executa o seed
seedFinancialData()
  .then(() => {
    console.log("\n✅ Processo concluído!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Erro fatal:", err);
    process.exit(1);
  });

