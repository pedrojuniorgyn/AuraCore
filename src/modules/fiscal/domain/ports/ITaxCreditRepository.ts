/**
 * Tax Credit Repository Port
 * 
 * Interface para persistência de créditos tributários
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 3/8 - tax-credit-engine.ts → TaxCreditCalculator
 */

import { Result } from "@/shared/domain";
import type { TaxCredit } from "../value-objects/TaxCredit";
import type { FiscalDocumentData } from "../services/TaxCreditCalculator";

export interface ChartAccount {
  id: bigint;
  code: string;
  name: string;
}

export interface TaxCreditRepository {
  /**
   * Busca dados de um documento fiscal para cálculo de crédito
   */
  getFiscalDocumentData(
    fiscalDocumentId: bigint,
    organizationId: bigint
  ): Promise<Result<FiscalDocumentData | null, Error>>;

  /**
   * Busca contas de crédito PIS/COFINS
   */
  getCreditAccounts(organizationId: bigint): Promise<Result<{
    pisAccount: ChartAccount;
    cofinsAccount: ChartAccount;
  }, Error>>;

  /**
   * Registra crédito tributário no sistema contábil
   */
  registerCredit(
    credit: TaxCredit,
    userId: string,
    organizationId: bigint
  ): Promise<Result<boolean, Error>>;

  /**
   * Busca documentos fiscais pendentes de processamento de crédito
   */
  getPendingDocuments(organizationId: bigint): Promise<Result<bigint[], Error>>;
}

