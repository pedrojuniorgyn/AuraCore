import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result, Money } from '@/shared/domain';
import type { FiscalDocument } from '../../domain/entities/FiscalDocument';
import type { IJournalEntryRepository } from '@/modules/accounting/domain/ports/output/IJournalEntryRepository';
import { JournalEntry } from '@/modules/accounting/domain/entities/JournalEntry';
import { JournalEntryLine } from '@/modules/accounting/domain/entities/JournalEntryLine';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { randomUUID } from 'crypto';

/**
 * FiscalAccountingIntegration
 * 
 * Serviço de integração entre Fiscal e Accounting (E7.3).
 * Responsável por gerar lançamentos contábeis automáticos quando documentos fiscais são autorizados.
 * 
 * Regras de Contabilização:
 * 
 * **NFE de Entrada (Compra):**
 * D - Estoque/Ativo (1.1.05.001)        R$ 1.000
 * D - ICMS a Recuperar (1.1.08.001)     R$   120
 * C - Fornecedores (2.1.01.001)         R$ 1.120
 * 
 * **NFE de Saída (Venda):**
 * D - Clientes (1.1.02.001)             R$ 1.180
 * C - Receita de Vendas (3.1.01.001)    R$ 1.000
 * C - ICMS a Recolher (2.1.04.001)      R$   180
 * 
 * **CTE (Frete):**
 * D - Despesa com Frete (3.2.03.001)    R$   500
 * C - Fornecedores (2.1.01.001)         R$   500
 * 
 * Ref: E7.3 (Accounting Module), E7.4 Week 5
 */
@injectable()
export class FiscalAccountingIntegration {
  constructor(
    @inject(TOKENS.JournalEntryRepository)
    private readonly journalEntryRepository: IJournalEntryRepository
  ) {}

  /**
   * Gera lançamento contábil para documento fiscal autorizado
   * 
   * @param document Documento fiscal autorizado
   * @param context Contexto de execução (user, org, branch)
   * @returns Result com ID do lançamento criado
   */
  async generateJournalEntryForAuthorizedDocument(
    document: FiscalDocument,
    context: {
      userId: string;
      organizationId: number;
      branchId: number;
    }
  ): Promise<Result<string, string>> {
    try {
      // Validar que documento está autorizado
      if (!document.isAuthrized) {
        return Result.fail('Documento não está autorizado. Não é possível gerar lançamento contábil.');
      }

      // Determinar tipo de lançamento baseado no documento
      const cfopCode = document.items[0]?.cfop.code || '0000';
      const isInbound = cfopCode.startsWith('1') || cfopCode.startsWith('2'); // 1xxx = entrada dentro estado, 2xxx = entrada fora estado
      const isOutbound = cfopCode.startsWith('5') || cfopCode.startsWith('6'); // 5xxx = saída dentro estado, 6xxx = saída fora estado

      // Gerar número do lançamento
      const entryNumber = `FIS-${document.documentType}-${document.number}`;

      // Criar lançamento
      const journalEntryId = randomUUID();
      const journalEntryResult = JournalEntry.create({
        id: journalEntryId,
        organizationId: context.organizationId,
        branchId: context.branchId,
        entryNumber,
        entryDate: document.issueDate,
        description: `${document.documentType} ${document.number} - ${document.issuerName}`,
        source: 'FISCAL_DOC',
        sourceId: document.id,
      });

      if (Result.isFail(journalEntryResult)) {
        return Result.fail(String(journalEntryResult.error));
      }

      const journalEntry = journalEntryResult.value;

      // Criar linhas baseadas no tipo de operação
      let linesResult: Result<void, string>;

      if (document.documentType === 'NFE' && isInbound) {
        linesResult = await this.addInboundNfeLines(journalEntry, document);
      } else if (document.documentType === 'NFE' && isOutbound) {
        linesResult = await this.addOutboundNfeLines(journalEntry, document);
      } else if (document.documentType === 'CTE') {
        linesResult = await this.addCteLines(journalEntry, document);
      } else {
        linesResult = await this.addGenericLines(journalEntry, document);
      }

      if (Result.isFail(linesResult)) {
        return Result.fail(linesResult.error);
      }

      // Salvar lançamento
      await this.journalEntryRepository.save(journalEntry);

      return Result.ok(journalEntry.id);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao gerar lançamento contábil: ${errorMessage}`);
    }
  }

  /**
   * Adiciona linhas para NFE de ENTRADA (Compra)
   */
  private async addInboundNfeLines(
    journalEntry: JournalEntry,
    document: FiscalDocument
  ): Promise<Result<void, string>> {
    const totalValue = document.totalDocument;

    // D - Estoque
    const debitLine = JournalEntryLine.create({
      id: randomUUID(),
      journalEntryId: journalEntry.id,
      accountId: '1', // TODO: Obter ID real da conta de Estoque
      accountCode: '1.1.05.001',
      entryType: 'DEBIT',
      amount: totalValue,
      description: 'Compra de mercadorias'
    });

    if (Result.isFail(debitLine)) {
      return Result.fail(String(debitLine.error));
    }

    // C - Fornecedores
    const creditLine = JournalEntryLine.create({
      id: randomUUID(),
      journalEntryId: journalEntry.id,
      accountId: '2', // TODO: Obter ID real da conta de Fornecedores
      accountCode: '2.1.01.001',
      entryType: 'CREDIT',
      amount: totalValue,
      description: `Fornecedor: ${document.issuerName}`
    });

    if (Result.isFail(creditLine)) {
      return Result.fail(String(creditLine.error));
    }

    // Adicionar linhas ao lançamento
    const addDebit = journalEntry.addLine(debitLine.value);
    const addCredit = journalEntry.addLine(creditLine.value);

    if (Result.isFail(addDebit) || Result.isFail(addCredit)) {
      return Result.fail(String(addDebit.error || addCredit.error));
    }

    return Result.ok(undefined);
  }

  /**
   * Adiciona linhas para NFE de SAÍDA (Venda)
   */
  private async addOutboundNfeLines(
    journalEntry: JournalEntry,
    document: FiscalDocument
  ): Promise<Result<void, string>> {
    const totalValue = document.totalDocument;

    // D - Clientes
    const debitLine = JournalEntryLine.create({
      id: randomUUID(),
      journalEntryId: journalEntry.id,
      accountId: '3', // TODO: Obter ID real da conta de Clientes
      accountCode: '1.1.02.001',
      entryType: 'DEBIT',
      amount: totalValue,
      description: `Cliente: ${document.recipientName || 'N/A'}`
    });

    if (Result.isFail(debitLine)) {
      return Result.fail(String(debitLine.error));
    }

    // C - Receita de Vendas
    const creditLine = JournalEntryLine.create({
      id: randomUUID(),
      journalEntryId: journalEntry.id,
      accountId: '4', // TODO: Obter ID real da conta de Receita
      accountCode: '3.1.01.001',
      entryType: 'CREDIT',
      amount: totalValue,
      description: 'Receita de vendas de mercadorias'
    });

    if (Result.isFail(creditLine)) {
      return Result.fail(String(creditLine.error));
    }

    // Adicionar linhas ao lançamento
    const addDebit = journalEntry.addLine(debitLine.value);
    const addCredit = journalEntry.addLine(creditLine.value);

    if (Result.isFail(addDebit) || Result.isFail(addCredit)) {
      return Result.fail(String(addDebit.error || addCredit.error));
    }

    return Result.ok(undefined);
  }

  /**
   * Adiciona linhas para CTE (Frete)
   */
  private async addCteLines(
    journalEntry: JournalEntry,
    document: FiscalDocument
  ): Promise<Result<void, string>> {
    const totalValue = document.totalDocument;

    // D - Despesa com Frete
    const debitLine = JournalEntryLine.create({
      id: randomUUID(),
      journalEntryId: journalEntry.id,
      accountId: '5', // TODO: Obter ID real da conta de Despesa com Frete
      accountCode: '3.2.03.001',
      entryType: 'DEBIT',
      amount: totalValue,
      description: 'Despesa com frete'
    });

    if (Result.isFail(debitLine)) {
      return Result.fail(String(debitLine.error));
    }

    // C - Fornecedores
    const creditLine = JournalEntryLine.create({
      id: randomUUID(),
      journalEntryId: journalEntry.id,
      accountId: '2', // TODO: Obter ID real da conta de Fornecedores
      accountCode: '2.1.01.001',
      entryType: 'CREDIT',
      amount: totalValue,
      description: `Transportadora: ${document.issuerName}`
    });

    if (Result.isFail(creditLine)) {
      return Result.fail(String(creditLine.error));
    }

    // Adicionar linhas ao lançamento
    const addDebit = journalEntry.addLine(debitLine.value);
    const addCredit = journalEntry.addLine(creditLine.value);

    if (Result.isFail(addDebit) || Result.isFail(addCredit)) {
      return Result.fail(String(addDebit.error || addCredit.error));
    }

    return Result.ok(undefined);
  }

  /**
   * Adiciona linhas genéricas para outros tipos (MDFE, NFSE)
   */
  private async addGenericLines(
    journalEntry: JournalEntry,
    document: FiscalDocument
  ): Promise<Result<void, string>> {
    const totalValue = document.totalDocument;

    // D - Conta genérica
    const debitLine = JournalEntryLine.create({
      id: randomUUID(),
      journalEntryId: journalEntry.id,
      accountId: '6', // TODO: Conta genérica
      accountCode: '9.9.99.001',
      entryType: 'DEBIT',
      amount: totalValue,
      description: `${document.documentType} - Débito`
    });

    if (Result.isFail(debitLine)) {
      return Result.fail(String(debitLine.error));
    }

    // C - Conta genérica
    const creditLine = JournalEntryLine.create({
      id: randomUUID(),
      journalEntryId: journalEntry.id,
      accountId: '7', // TODO: Conta genérica
      accountCode: '9.9.99.002',
      entryType: 'CREDIT',
      amount: totalValue,
      description: `${document.documentType} - Crédito`
    });

    if (Result.isFail(creditLine)) {
      return Result.fail(String(creditLine.error));
    }

    // Adicionar linhas ao lançamento
    const addDebit = journalEntry.addLine(debitLine.value);
    const addCredit = journalEntry.addLine(creditLine.value);

    if (Result.isFail(addDebit) || Result.isFail(addCredit)) {
      return Result.fail(String(addDebit.error || addCredit.error));
    }

    return Result.ok(undefined);
  }
}
