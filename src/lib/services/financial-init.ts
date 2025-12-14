import { db } from "@/lib/db";
import { financialCategories, bankAccounts } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

const DEFAULT_CATEGORIES = {
  INCOME: [
    { name: "Venda de Frete", code: "1.01" },
    { name: "Venda de Produto", code: "1.02" },
    { name: "Prestação de Serviços", code: "1.03" },
    { name: "Outras Receitas", code: "1.99" },
  ],
  EXPENSE: [
    { name: "Fornecedores (NFe)", code: "2.01", description: "Compras via NFe" },
    { name: "Combustível", code: "2.02" },
    { name: "Manutenção", code: "2.03" },
    { name: "Administrativo", code: "2.04" },
    { name: "Impostos e Taxas", code: "2.05" },
    { name: "Salários", code: "2.06" },
    { name: "Água, Luz, Telefone", code: "2.07" },
    { name: "Aluguel", code: "2.08" },
    { name: "Outras Despesas", code: "2.99" },
  ],
};

const DEFAULT_BANK_ACCOUNTS = [
  { name: "Caixa", bankCode: "000", bankName: "Caixa Geral", accountType: "CASH", initialBalance: 1000 },
  { name: "Banco Principal", bankCode: "001", bankName: "Banco do Brasil", accountType: "CHECKING", initialBalance: 10000 },
];

/**
 * Inicializa dados financeiros básicos se não existirem
 * Chamado automaticamente nas APIs quando necessário
 */
export async function ensureFinancialData(organizationId: number, userId: string) {
  try {
    // Verifica categorias
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
      console.log("🌱 Criando categorias financeiras padrão...");
      
      for (const cat of DEFAULT_CATEGORIES.INCOME) {
        await db.insert(financialCategories).values({
          organizationId,
          name: cat.name,
          code: cat.code,
          type: "INCOME",
          status: "ACTIVE",
          createdBy: userId,
          updatedBy: userId,
          version: 1,
        });
      }

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
          version: 1,
        });
      }

      console.log(`✅ ${DEFAULT_CATEGORIES.INCOME.length + DEFAULT_CATEGORIES.EXPENSE.length} categorias criadas`);
    }

    // Verifica contas bancárias
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
      console.log("🌱 Criando contas bancárias padrão...");
      
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
          version: 1,
        });
      }

      console.log(`✅ ${DEFAULT_BANK_ACCOUNTS.length} contas bancárias criadas`);
    }
  } catch (error: any) {
    console.error("⚠️  Erro ao inicializar dados financeiros:", error.message);
    // Não lança erro para não quebrar a API
  }
}

















