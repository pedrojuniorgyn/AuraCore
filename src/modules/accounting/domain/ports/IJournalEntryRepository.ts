/**
 * Journal Entry Repository Port
 * 
 * Interface para persistência de lançamentos contábeis
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 4/8 - accounting-engine.ts → JournalEntryGenerator
 */

import { Result } from "@/shared/domain";
import type { JournalLine } from "../value-objects/JournalLine";

export interface FiscalDocumentData {
  id: bigint;
  organizationId: bigint;
  branchId: bigint;
  documentType: string;
  documentNumber: string;
  issueDate: Date;
  netAmount: number;
  fiscalClassification: string;
  accountingStatus: string;
}

export interface FiscalDocumentItem {
  id: bigint;
  chartAccountId: bigint | null;
  chartAccountCode: string | null;
  chartAccountName: string | null;
  netAmount: number;
}

export interface ChartAccount {
  id: bigint;
  code: string;
  name: string;
  isAnalytical: boolean;
}

export interface JournalEntryData {
  id: bigint;
  organizationId: bigint;
  branchId: bigint;
  fiscalDocumentId: bigint | null;
  entryType: string;
  entryDate: Date;
  description: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
  createdBy: string;
}

export interface IJournalEntryRepository {
  /**
   * Busca dados do documento fiscal para contabilização
   */
  getFiscalDocumentData(
    fiscalDocumentId: bigint,
    organizationId: bigint
  ): Promise<Result<FiscalDocumentData | null, Error>>;

  /**
   * Busca itens do documento fiscal com categorização contábil
   */
  getFiscalDocumentItems(
    fiscalDocumentId: bigint
  ): Promise<Result<FiscalDocumentItem[], Error>>;

  /**
   * Busca conta contábil por ID
   */
  getChartAccountById(
    accountId: bigint,
    organizationId: bigint
  ): Promise<Result<ChartAccount | null, Error>>;

  /**
   * Busca contas analíticas filhas de uma conta sintética
   */
  getAnalyticalAccounts(
    parentAccountId: bigint,
    organizationId: bigint
  ): Promise<Result<ChartAccount[], Error>>;

  /**
   * Busca conta de contrapartida (Fornecedores ou Clientes)
   */
  getCounterpartAccount(
    organizationId: bigint,
    fiscalClassification: string
  ): Promise<Result<ChartAccount | null, Error>>;

  /**
   * Cria lançamento contábil principal
   */
  createJournalEntry(
    entry: Omit<JournalEntryData, 'id'>
  ): Promise<Result<bigint, Error>>;

  /**
   * Cria linhas do lançamento contábil
   */
  createJournalEntryLines(
    journalEntryId: bigint,
    lines: JournalLine[]
  ): Promise<Result<void, Error>>;

  /**
   * Atualiza status contábil do documento fiscal
   */
  updateFiscalDocumentAccountingStatus(
    fiscalDocumentId: bigint,
    journalEntryId: bigint,
    status: string
  ): Promise<Result<void, Error>>;

  /**
   * Busca lançamento contábil por ID (com validação de organizationId)
   */
  getJournalEntryById(
    journalEntryId: bigint,
    organizationId: bigint
  ): Promise<Result<JournalEntryData | null, Error>>;

  /**
   * Reverte lançamento contábil
   */
  reverseJournalEntry(
    journalEntryId: bigint,
    userId: string
  ): Promise<Result<void, Error>>;
}

