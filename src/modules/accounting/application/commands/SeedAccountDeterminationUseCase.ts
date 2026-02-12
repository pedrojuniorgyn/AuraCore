import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IAccountDeterminationRepository } from '../../domain/ports/output/IAccountDeterminationRepository';
import { AccountDetermination } from '../../domain/entities/AccountDetermination';
import { OPERATION_TYPES } from '../../domain/value-objects/OperationType';

/**
 * SeedAccountDeterminationUseCase
 * 
 * Insere regras padrão de determinação contábil se não existirem.
 * Baseado no Plano de Contas brasileiro padrão para transportadoras.
 * 
 * Referência SAP: OBYS - Seed de Account Determination por empresa
 * Referência TOTVS: CT5 - Lançamento Padrão (seed por filial)
 */

interface SeedInput {
  organizationId: number;
  branchId: number;
}

interface SeedOutput {
  inserted: number;
  total: number;
}

/**
 * Regras padrão para Plano de Contas brasileiro (transportadora)
 * 
 * Estrutura do Plano de Contas:
 * 1.x.xx.xxx - ATIVO
 *   1.1.02 - Clientes
 *   1.1.04 - Bancos Conta Movimento
 *   1.1.05 - Estoques
 *   1.1.08 - ICMS a Recuperar
 * 2.x.xx.xxx - PASSIVO
 *   2.1.01 - Fornecedores
 *   2.1.04 - ICMS a Recolher
 *   2.1.05 - ISS a Recolher
 *   2.1.06 - IRRF a Recolher
 *   2.1.07 - PIS a Recolher
 *   2.1.08 - COFINS a Recolher
 *   2.1.09 - CSLL a Recolher
 *   2.1.10 - IOF a Recolher
 * 3.x.xx.xxx - RESULTADO
 *   3.1.01 - Receita de Transporte
 *   3.2.03 - Despesa com Frete
 *   3.2.05 - Descontos Concedidos
 *   3.3.01 - Receitas Financeiras
 *   3.3.02 - Despesas Financeiras
 *   3.3.03 - Multas Recebidas
 *   3.3.04 - Multas Pagas
 *   3.3.05 - Tarifas Bancárias
 */
const DEFAULT_RULES: Array<{
  operationType: string;
  debitAccountCode: string;
  creditAccountCode: string;
  description: string;
}> = [
  // Fiscal → Contábil
  {
    operationType: OPERATION_TYPES.PURCHASE_NFE,
    debitAccountCode: '1.1.05.001',
    creditAccountCode: '2.1.01.001',
    description: 'NFe Compra: D-Estoque / C-Fornecedores',
  },
  {
    operationType: OPERATION_TYPES.SALE_NFE,
    debitAccountCode: '1.1.02.001',
    creditAccountCode: '3.1.01.001',
    description: 'NFe Venda: D-Clientes / C-Receita Vendas',
  },
  {
    operationType: OPERATION_TYPES.CTE_FREIGHT,
    debitAccountCode: '3.2.03.001',
    creditAccountCode: '2.1.01.001',
    description: 'CTe Frete: D-Despesa Frete / C-Fornecedores',
  },
  {
    operationType: OPERATION_TYPES.GENERIC_FISCAL,
    debitAccountCode: '9.9.99.001',
    creditAccountCode: '9.9.99.002',
    description: 'Fiscal Genérico: D-Conta Genérica / C-Conta Genérica',
  },

  // Financial → Contábil (Pagamentos)
  {
    operationType: OPERATION_TYPES.PAYMENT_SUPPLIER,
    debitAccountCode: '2.1.01.001',
    creditAccountCode: '1.1.04.001',
    description: 'Pagamento Fornecedor: D-Fornecedores / C-Banco',
  },
  {
    operationType: OPERATION_TYPES.PAYMENT_BANK,
    debitAccountCode: '2.1.01.001',
    creditAccountCode: '1.1.04.001',
    description: 'Baixa Bancária: D-Fornecedores / C-Banco',
  },

  // Financial → Contábil (Recebimentos)
  {
    operationType: OPERATION_TYPES.RECEIPT_CUSTOMER,
    debitAccountCode: '1.1.04.001',
    creditAccountCode: '1.1.02.001',
    description: 'Recebimento Cliente: D-Banco / C-Clientes',
  },
  {
    operationType: OPERATION_TYPES.RECEIPT_BANK,
    debitAccountCode: '1.1.04.001',
    creditAccountCode: '1.1.02.001',
    description: 'Entrada Bancária: D-Banco / C-Clientes',
  },

  // Financial → Contábil (Faturamento)
  {
    operationType: OPERATION_TYPES.BILLING_REVENUE,
    debitAccountCode: '1.1.02.001',
    creditAccountCode: '3.1.01.001',
    description: 'Faturamento: D-Clientes / C-Receita Transporte',
  },

  // Retenções (Billing)
  {
    operationType: OPERATION_TYPES.BILLING_ISS,
    debitAccountCode: '3.1.01.001',
    creditAccountCode: '2.1.05.001',
    description: 'ISS Retido: D-Receita / C-ISS a Recolher',
  },
  {
    operationType: OPERATION_TYPES.BILLING_IRRF,
    debitAccountCode: '3.1.01.001',
    creditAccountCode: '2.1.06.001',
    description: 'IRRF Retido: D-Receita / C-IRRF a Recolher',
  },
  {
    operationType: OPERATION_TYPES.BILLING_PIS,
    debitAccountCode: '3.1.01.001',
    creditAccountCode: '2.1.07.001',
    description: 'PIS Retido: D-Receita / C-PIS a Recolher',
  },
  {
    operationType: OPERATION_TYPES.BILLING_COFINS,
    debitAccountCode: '3.1.01.001',
    creditAccountCode: '2.1.08.001',
    description: 'COFINS Retida: D-Receita / C-COFINS a Recolher',
  },
  {
    operationType: OPERATION_TYPES.BILLING_CSLL,
    debitAccountCode: '3.1.01.001',
    creditAccountCode: '2.1.09.001',
    description: 'CSLL Retida: D-Receita / C-CSLL a Recolher',
  },

  // Estorno
  {
    operationType: OPERATION_TYPES.CANCELLATION_REVERSAL,
    debitAccountCode: '9.9.99.001',
    creditAccountCode: '9.9.99.002',
    description: 'Estorno: contas determinadas pelo lançamento original',
  },

  // Juros e Multas
  {
    operationType: OPERATION_TYPES.INTEREST_INCOME,
    debitAccountCode: '1.1.04.001',
    creditAccountCode: '3.3.01.001',
    description: 'Juros Recebidos: D-Banco / C-Receitas Financeiras',
  },
  {
    operationType: OPERATION_TYPES.INTEREST_EXPENSE,
    debitAccountCode: '3.3.02.001',
    creditAccountCode: '1.1.04.001',
    description: 'Juros Pagos: D-Despesas Financeiras / C-Banco',
  },
  {
    operationType: OPERATION_TYPES.FINE_INCOME,
    debitAccountCode: '1.1.04.001',
    creditAccountCode: '3.3.03.001',
    description: 'Multa Recebida: D-Banco / C-Multas Recebidas',
  },
  {
    operationType: OPERATION_TYPES.FINE_EXPENSE,
    debitAccountCode: '3.3.04.001',
    creditAccountCode: '1.1.04.001',
    description: 'Multa Paga: D-Multas Pagas / C-Banco',
  },

  // Descontos
  {
    operationType: OPERATION_TYPES.DISCOUNT_GIVEN,
    debitAccountCode: '3.2.05.001',
    creditAccountCode: '1.1.02.001',
    description: 'Desconto Concedido: D-Descontos Concedidos / C-Clientes',
  },
  {
    operationType: OPERATION_TYPES.DISCOUNT_RECEIVED,
    debitAccountCode: '2.1.01.001',
    creditAccountCode: '3.3.01.001',
    description: 'Desconto Obtido: D-Fornecedores / C-Receitas Financeiras',
  },

  // Outros
  {
    operationType: OPERATION_TYPES.BANK_FEE,
    debitAccountCode: '3.3.05.001',
    creditAccountCode: '1.1.04.001',
    description: 'Tarifa Bancária: D-Tarifas Bancárias / C-Banco',
  },
  {
    operationType: OPERATION_TYPES.IOF,
    debitAccountCode: '3.3.02.001',
    creditAccountCode: '2.1.10.001',
    description: 'IOF: D-Despesas Financeiras / C-IOF a Recolher',
  },
  {
    operationType: OPERATION_TYPES.GENERIC,
    debitAccountCode: '9.9.99.001',
    creditAccountCode: '9.9.99.002',
    description: 'Genérico: configurar manualmente',
  },
];

@injectable()
export class SeedAccountDeterminationUseCase {
  constructor(
    @inject(TOKENS.AccountDeterminationRepository)
    private readonly repository: IAccountDeterminationRepository,
  ) {}

  async execute(input: SeedInput): Promise<Result<SeedOutput, string>> {
    if (!input.organizationId || input.organizationId <= 0) {
      return Result.fail('organizationId deve ser positivo');
    }
    if (!input.branchId || input.branchId <= 0) {
      return Result.fail('branchId deve ser positivo');
    }

    // Criar entities a partir das regras padrão
    const entities: AccountDetermination[] = [];
    for (const rule of DEFAULT_RULES) {
      // Gerar IDs incrementais para o seed (serão substituídos por UUID reais)
      const accountId = globalThis.crypto.randomUUID();
      const result = AccountDetermination.create({
        organizationId: input.organizationId,
        branchId: input.branchId,
        operationType: rule.operationType,
        debitAccountId: accountId, // Placeholder: será configurado pelo cliente
        debitAccountCode: rule.debitAccountCode,
        creditAccountId: accountId, // Placeholder: será configurado pelo cliente
        creditAccountCode: rule.creditAccountCode,
        description: rule.description,
      });

      if (Result.isFail(result)) {
        return Result.fail(`Erro ao criar regra ${rule.operationType}: ${result.error}`);
      }

      entities.push(result.value);
    }

    const inserted = await this.repository.seedDefaults(
      input.organizationId,
      input.branchId,
      entities
    );

    return Result.ok({
      inserted,
      total: DEFAULT_RULES.length,
    });
  }
}
