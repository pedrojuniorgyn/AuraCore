/**
 * 💰 FINANCIAL TITLE REPOSITORY PORT
 * 
 * Interface defining the contract for financial title persistence
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 */

import { Result } from "@/shared/domain";

export interface FiscalDocumentData {
  id: bigint;
  organizationId: bigint;
  branchId: bigint;
  partnerId: bigint | null;
  partnerName: string | null;
  documentNumber: string;
  documentType: string;
  issueDate: Date;
  netAmount: number;
  fiscalClassification: string | null;
  financialStatus: string;
}

export interface AccountPayableInsert {
  organizationId: bigint;
  branchId: bigint;
  partnerId: bigint | null;
  fiscalDocumentId: bigint;
  description: string;
  documentNumber: string;
  issueDate: Date;
  dueDate: Date;
  amount: number;
  amountPaid: number;
  discount: number;
  interest: number;
  fine: number;
  status: string;
  origin: string;
  createdBy: string;
  updatedBy: string;
}

export interface AccountReceivableInsert {
  organizationId: bigint;
  branchId: bigint;
  partnerId: bigint | null;
  fiscalDocumentId: bigint;
  description: string;
  documentNumber: string;
  issueDate: Date;
  dueDate: Date;
  amount: number;
  amountReceived: number;
  discount: number;
  interest: number;
  fine: number;
  status: string;
  origin: string;
  createdBy: string;
  updatedBy: string;
}

export interface TitleData {
  id: bigint;
  amount: number;
  type: 'PAYABLE' | 'RECEIVABLE';
}

export interface IFinancialTitleRepository {
  /**
   * Busca documento fiscal por ID com validação de organização
   */
  getFiscalDocumentById(
    fiscalDocumentId: bigint,
    organizationId: bigint
  ): Promise<Result<FiscalDocumentData | null, Error>>;

  /**
   * Cria uma conta a pagar
   */
  createAccountPayable(
    data: AccountPayableInsert
  ): Promise<Result<bigint, Error>>;

  /**
   * Cria uma conta a receber
   */
  createAccountReceivable(
    data: AccountReceivableInsert
  ): Promise<Result<bigint, Error>>;

  /**
   * Atualiza status financeiro do documento fiscal
   */
  updateFiscalDocumentFinancialStatus(
    fiscalDocumentId: bigint,
    status: 'NO_TITLE' | 'GENERATED',
    organizationId: bigint
  ): Promise<Result<void, Error>>;

  /**
   * Verifica se existem títulos pagos/recebidos para um documento
   */
  hasPaidTitles(
    fiscalDocumentId: bigint,
    organizationId: bigint
  ): Promise<Result<boolean, Error>>;

  /**
   * Reverte (soft delete) todos os títulos de um documento
   */
  reverseTitles(
    fiscalDocumentId: bigint,
    organizationId: bigint
  ): Promise<Result<void, Error>>;
}

