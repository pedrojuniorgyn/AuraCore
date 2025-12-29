import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';

/**
 * Tipo de compensação
 */
export enum CompensationType {
  // Crédito IBS/CBS compensando débito PIS/COFINS
  NEW_CREDITS_OFFSET_OLD_DEBITS = 'NEW_CREDITS_OFFSET_OLD_DEBITS',
  
  // Crédito PIS/COFINS compensando débito IBS/CBS
  OLD_CREDITS_OFFSET_NEW_DEBITS = 'OLD_CREDITS_OFFSET_NEW_DEBITS',
  
  // Sem compensação (regimes incompatíveis)
  NO_COMPENSATION = 'NO_COMPENSATION',
}

/**
 * Parâmetros para cálculo de compensação
 */
export interface CompensationParams {
  // Ano de referência
  year: number;
  
  // Créditos do sistema atual (PIS/COFINS acumulados)
  oldSystemCredits: Money;
  
  // Créditos do novo sistema (IBS/CBS)
  newSystemCredits: Money;
  
  // Débitos do sistema atual (PIS/COFINS devidos)
  oldSystemDebits: Money;
  
  // Débitos do novo sistema (IBS/CBS devidos)
  newSystemDebits: Money;
  
  // UF do contribuinte (para verificar regras específicas)
  ufCode: string;
  
  // Regime tributário do contribuinte
  taxRegime: 'REAL' | 'PRESUMIDO' | 'SIMPLES';
}

/**
 * Resultado do cálculo de compensação
 */
export interface CompensationResult {
  // Tipo de compensação aplicada
  compensationType: CompensationType;
  
  // Valor da compensação
  compensationAmount: Money;
  
  // Crédito remanescente do sistema antigo
  oldSystemRemainingCredit: Money;
  
  // Crédito remanescente do novo sistema
  newSystemRemainingCredit: Money;
  
  // Débito líquido do sistema antigo (após compensação)
  oldSystemNetDebit: Money;
  
  // Débito líquido do novo sistema (após compensação)
  newSystemNetDebit: Money;
  
  // Total a pagar (soma dos débitos líquidos)
  totalDue: Money;
  
  // Detalhes/observações
  details: string;
  
  // Ano de referência
  year: number;
}

/**
 * Compensation Engine
 * 
 * Gerencia compensações entre o sistema tributário atual (PIS/COFINS)
 * e o novo sistema (IBS/CBS) durante o período de transição (2026-2032).
 * 
 * Regras de compensação (LC 214/2025):
 * 
 * 1. PERÍODO 2026:
 *    - PIS/COFINS ainda vigentes (100%)
 *    - CBS em teste (0,9%)
 *    - Créditos PIS/COFINS podem compensar débitos CBS
 *    - Segregação de créditos por regime
 * 
 * 2. PERÍODO 2027-2032:
 *    - PIS/COFINS extintos (2027)
 *    - CBS alíquota cheia (8,8%)
 *    - ICMS/ISS redução gradual
 *    - IBS aumento gradual
 *    - Créditos acumulados de PIS/COFINS podem ser:
 *      a) Compensados com CBS/IBS
 *      b) Ressarcidos
 *      c) Transferidos
 * 
 * 3. PERÍODO 2033+:
 *    - Novo sistema 100% implementado
 *    - Créditos antigos (se houver) podem ser ressarcidos
 * 
 * Características:
 * - Prazo para utilização de créditos acumulados: até 2037
 * - Atualização monetária dos créditos (SELIC)
 * - Segregação por tipo de regime (Real, Presumido, Simples)
 * - Auditoria obrigatória de compensações > R$ 1MM
 * 
 * Base Legal: LC 214/2025, Arts. 25-32 (Disposições Transitórias)
 */
export class CompensationEngine {
  /**
   * Calcula compensação entre sistemas tributários
   */
  calculate(params: CompensationParams): Result<CompensationResult, string> {
    // Validar parâmetros
    const validationResult = this.validateParams(params);
    if (Result.isFail(validationResult)) {
      return validationResult;
    }

    // Verificar se compensação é aplicável
    const compensationType = this.getCompensationType(params.year, params.taxRegime);

    // Inicializar resultado
    const zeroMoneyResult = Money.create(0, params.oldSystemCredits.currency);
    if (Result.isFail(zeroMoneyResult)) {
      return Result.fail('Failed to create zero Money');
    }
    const zeroMoney = zeroMoneyResult.value;

    let compensationAmount = zeroMoney;
    let oldSystemRemainingCredit = params.oldSystemCredits;
    let newSystemRemainingCredit = params.newSystemCredits;
    let oldSystemNetDebit = params.oldSystemDebits;
    let newSystemNetDebit = params.newSystemDebits;
    let details = '';

    // Aplicar compensação conforme tipo
    switch (compensationType) {
      case CompensationType.OLD_CREDITS_OFFSET_NEW_DEBITS: {
        // Créditos PIS/COFINS compensam débitos IBS/CBS
        const compensationResult = this.compensateOldCreditsWithNewDebits(
          params.oldSystemCredits,
          params.newSystemDebits
        );
        
        if (Result.isOk(compensationResult)) {
          compensationAmount = compensationResult.value.amount;
          oldSystemRemainingCredit = compensationResult.value.remainingOldCredit;
          newSystemNetDebit = compensationResult.value.newNetDebit;
          details = `Créditos PIS/COFINS (${params.oldSystemCredits.format()}) compensaram débitos IBS/CBS`;
        }
        break;
      }

      case CompensationType.NEW_CREDITS_OFFSET_OLD_DEBITS: {
        // Créditos IBS/CBS compensam débitos PIS/COFINS
        const compensationResult = this.compensateNewCreditsWithOldDebits(
          params.newSystemCredits,
          params.oldSystemDebits
        );
        
        if (Result.isOk(compensationResult)) {
          compensationAmount = compensationResult.value.amount;
          newSystemRemainingCredit = compensationResult.value.remainingNewCredit;
          oldSystemNetDebit = compensationResult.value.oldNetDebit;
          details = `Créditos IBS/CBS (${params.newSystemCredits.format()}) compensaram débitos PIS/COFINS`;
        }
        break;
      }

      case CompensationType.NO_COMPENSATION: {
        // Sem compensação - sistemas segregados
        details = 'Sistemas segregados - compensação não aplicável neste regime/período';
        break;
      }
    }

    // Calcular total a pagar
    const totalDueResult = oldSystemNetDebit.add(newSystemNetDebit);
    if (Result.isFail(totalDueResult)) {
      return Result.fail('Failed to calculate total due');
    }
    const totalDue = totalDueResult.value;

    return Result.ok({
      compensationType,
      compensationAmount,
      oldSystemRemainingCredit,
      newSystemRemainingCredit,
      oldSystemNetDebit,
      newSystemNetDebit,
      totalDue,
      details,
      year: params.year,
    });
  }

  /**
   * Compensa créditos antigos (PIS/COFINS) com débitos novos (IBS/CBS)
   */
  private compensateOldCreditsWithNewDebits(
    oldCredits: Money,
    newDebits: Money
  ): Result<
    {
      amount: Money;
      remainingOldCredit: Money;
      newNetDebit: Money;
    },
    string
  > {
    // Calcular quanto pode ser compensado (menor valor)
    const compensationAmount = Math.min(oldCredits.amount, newDebits.amount);
    
    const compensationMoneyResult = Money.create(compensationAmount, oldCredits.currency);
    if (Result.isFail(compensationMoneyResult)) {
      return Result.fail('Failed to create compensation Money');
    }
    const compensationMoney = compensationMoneyResult.value;

    // Calcular crédito remanescente
    const remainingCreditAmount = oldCredits.amount - compensationAmount;
    const remainingCreditResult = Money.create(remainingCreditAmount, oldCredits.currency);
    if (Result.isFail(remainingCreditResult)) {
      return Result.fail('Failed to create remaining credit Money');
    }

    // Calcular débito líquido
    const netDebitAmount = newDebits.amount - compensationAmount;
    const netDebitResult = Money.create(netDebitAmount, newDebits.currency);
    if (Result.isFail(netDebitResult)) {
      return Result.fail('Failed to create net debit Money');
    }

    return Result.ok({
      amount: compensationMoney,
      remainingOldCredit: remainingCreditResult.value,
      newNetDebit: netDebitResult.value,
    });
  }

  /**
   * Compensa créditos novos (IBS/CBS) com débitos antigos (PIS/COFINS)
   */
  private compensateNewCreditsWithOldDebits(
    newCredits: Money,
    oldDebits: Money
  ): Result<
    {
      amount: Money;
      remainingNewCredit: Money;
      oldNetDebit: Money;
    },
    string
  > {
    // Calcular quanto pode ser compensado (menor valor)
    const compensationAmount = Math.min(newCredits.amount, oldDebits.amount);
    
    const compensationMoneyResult = Money.create(compensationAmount, newCredits.currency);
    if (Result.isFail(compensationMoneyResult)) {
      return Result.fail('Failed to create compensation Money');
    }
    const compensationMoney = compensationMoneyResult.value;

    // Calcular crédito remanescente
    const remainingCreditAmount = newCredits.amount - compensationAmount;
    const remainingCreditResult = Money.create(remainingCreditAmount, newCredits.currency);
    if (Result.isFail(remainingCreditResult)) {
      return Result.fail('Failed to create remaining credit Money');
    }

    // Calcular débito líquido
    const netDebitAmount = oldDebits.amount - compensationAmount;
    const netDebitResult = Money.create(netDebitAmount, oldDebits.currency);
    if (Result.isFail(netDebitResult)) {
      return Result.fail('Failed to create net debit Money');
    }

    return Result.ok({
      amount: compensationMoney,
      remainingNewCredit: remainingCreditResult.value,
      oldNetDebit: netDebitResult.value,
    });
  }

  /**
   * Determina o tipo de compensação aplicável
   */
  private getCompensationType(year: number, taxRegime: string): CompensationType {
    // 2026: PIS/COFINS ainda vigentes, CBS em teste
    if (year === 2026) {
      return CompensationType.OLD_CREDITS_OFFSET_NEW_DEBITS;
    }

    // 2027-2032: PIS/COFINS extintos, créditos acumulados podem compensar IBS/CBS
    if (year >= 2027 && year <= 2032) {
      return CompensationType.OLD_CREDITS_OFFSET_NEW_DEBITS;
    }

    // 2033+: Apenas novo sistema, créditos antigos apenas ressarcidos
    if (year >= 2033) {
      // Simples Nacional não acumula créditos
      if (taxRegime === 'SIMPLES') {
        return CompensationType.NO_COMPENSATION;
      }
      
      // Créditos antigos ainda podem compensar até 2037
      if (year <= 2037) {
        return CompensationType.OLD_CREDITS_OFFSET_NEW_DEBITS;
      }
      
      return CompensationType.NO_COMPENSATION;
    }

    return CompensationType.NO_COMPENSATION;
  }

  /**
   * Valida parâmetros obrigatórios
   */
  private validateParams(params: CompensationParams): Result<void, string> {
    if (params.year < 2026) {
      return Result.fail('Compensation only applicable from 2026 onwards');
    }

    if (params.oldSystemCredits.amount < 0) {
      return Result.fail('Old system credits cannot be negative');
    }

    if (params.newSystemCredits.amount < 0) {
      return Result.fail('New system credits cannot be negative');
    }

    if (params.oldSystemDebits.amount < 0) {
      return Result.fail('Old system debits cannot be negative');
    }

    if (params.newSystemDebits.amount < 0) {
      return Result.fail('New system debits cannot be negative');
    }

    if (!params.ufCode || params.ufCode.length !== 2) {
      return Result.fail('Valid UF code (2 digits) is required');
    }

    const validRegimes = ['REAL', 'PRESUMIDO', 'SIMPLES'];
    if (!validRegimes.includes(params.taxRegime)) {
      return Result.fail(`Tax regime must be one of: ${validRegimes.join(', ')}`);
    }

    // Validar mesma moeda
    if (
      params.oldSystemCredits.currency !== params.newSystemCredits.currency ||
      params.oldSystemCredits.currency !== params.oldSystemDebits.currency ||
      params.oldSystemCredits.currency !== params.newSystemDebits.currency
    ) {
      return Result.fail('All Money values must use the same currency');
    }

    return Result.ok(undefined);
  }

  /**
   * Calcula atualização monetária de créditos acumulados (SELIC)
   * 
   * Créditos acumulados até 2026 são atualizados pela SELIC
   * conforme previsto na LC 214/2025
   */
  static calculateMonetaryUpdate(
    creditAmount: Money,
    referenceDate: Date,
    updateDate: Date,
    selicRate: number
  ): Result<Money, string> {
    if (selicRate < 0 || selicRate > 100) {
      return Result.fail('SELIC rate must be between 0% and 100%');
    }

    if (referenceDate > updateDate) {
      return Result.fail('Reference date cannot be after update date');
    }

    // Calcular número de meses
    const months =
      (updateDate.getFullYear() - referenceDate.getFullYear()) * 12 +
      (updateDate.getMonth() - referenceDate.getMonth());

    if (months === 0) {
      return Result.ok(creditAmount);
    }

    // Aplicar SELIC pro rata (simplificado - na prática usa tabela SELIC mensal)
    const monthlyRate = selicRate / 12 / 100;
    const multiplier = Math.pow(1 + monthlyRate, months);
    const updatedAmount = creditAmount.amount * multiplier;

    return Money.create(updatedAmount, creditAmount.currency);
  }

  /**
   * Verifica se contribuinte tem direito a compensação
   */
  static isEligibleForCompensation(
    year: number,
    taxRegime: string,
    hasOldCredits: boolean
  ): boolean {
    // Simples Nacional não acumula créditos
    if (taxRegime === 'SIMPLES') {
      return false;
    }

    // Apenas se houver créditos acumulados
    if (!hasOldCredits) {
      return false;
    }

    // Prazo limite: 2037
    if (year > 2037) {
      return false;
    }

    return true;
  }
}

