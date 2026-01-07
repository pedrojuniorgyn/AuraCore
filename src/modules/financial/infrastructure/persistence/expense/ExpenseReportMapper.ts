import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import { ExpenseReport, ExpenseReportProps } from '../../../domain/entities/expense/ExpenseReport';
import { ExpenseItem, ExpenseItemProps } from '../../../domain/entities/expense/ExpenseItem';
import { Advance, AdvanceProps } from '../../../domain/value-objects/expense/Advance';
import { ExpenseReportStatus } from '../../../domain/value-objects/expense/ExpenseReportStatus';
import { ExpenseCategory } from '../../../domain/value-objects/expense/ExpenseCategory';
import { ComprovanteType } from '../../../domain/entities/expense/ExpenseItem';

/**
 * Persistence Interface: ExpenseReport
 * DEVE espelhar Schema Drizzle COMPLETO (INFRA-008)
 */
export interface ExpenseReportPersistence {
  id: string;
  organizationId: number;
  branchId: number;
  
  employeeId: string;
  employeeName: string;
  costCenterId: string;
  
  periodoInicio: Date;
  periodoFim: Date;
  motivo: string;
  projeto: string | null;
  
  // Advance (nullable group)
  advanceValorSolicitadoAmount: string | null;
  advanceValorSolicitadoCurrency: string | null;
  advanceDataSolicitacao: Date | null;
  advanceStatusAprovacao: string | null;
  advanceValorAprovadoAmount: string | null;
  advanceValorAprovadoCurrency: string | null;
  advanceDataLiberacao: Date | null;
  advanceAprovadorId: string | null;
  
  // Totais (Money)
  totalDespesasAmount: string;
  totalDespesasCurrency: string;
  saldoAmount: string;
  saldoCurrency: string;
  
  status: string;
  
  submittedAt: Date | null;
  reviewerId: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  
  payableId: string | null;
  
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  deletedAt: Date | null;
}

/**
 * Persistence Interface: ExpenseItem
 * DEVE espelhar Schema Drizzle COMPLETO (INFRA-008)
 */
export interface ExpenseItemPersistence {
  id: string;
  expenseReportId: string;
  
  categoria: string;
  data: Date;
  descricao: string;
  
  valorAmount: string;
  valorCurrency: string;
  
  comprovanteType: string | null;
  comprovanteNumero: string | null;
  comprovanteUrl: string | null;
  
  dentroPolitica: boolean;
  motivoViolacao: string | null;
}

/**
 * Mapper: ExpenseReport ↔ Persistence
 * 
 * REGRAS OBRIGATÓRIAS (infrastructure-layer.json):
 * - toPersistence mapeia TODOS os campos (INFRA-009)
 * - toDomain usa reconstitute(), não create() (INFRA-006)
 * - Money com 2 campos (INFRA-002)
 */
export class ExpenseReportMapper {
  /**
   * Domain → Persistence
   * DEVE mapear TODOS os campos (INFRA-009)
   */
  static toPersistence(report: ExpenseReport): ExpenseReportPersistence {
    return {
      id: report.id,
      organizationId: report.organizationId,
      branchId: report.branchId,
      
      employeeId: report.employeeId,
      employeeName: report.employeeName,
      costCenterId: report.costCenterId,
      
      periodoInicio: report.periodoInicio,
      periodoFim: report.periodoFim,
      motivo: report.motivo,
      projeto: report.projeto || null,
      
      // Advance (todos ou nenhum)
      advanceValorSolicitadoAmount: report.advance?.valorSolicitado.amount.toFixed(2) || null,
      advanceValorSolicitadoCurrency: report.advance?.valorSolicitado.currency || null,
      advanceDataSolicitacao: report.advance?.dataSolicitacao || null,
      advanceStatusAprovacao: report.advance?.statusAprovacao || null,
      advanceValorAprovadoAmount: report.advance?.valorAprovado?.amount.toFixed(2) || null,
      advanceValorAprovadoCurrency: report.advance?.valorAprovado?.currency || null,
      advanceDataLiberacao: report.advance?.dataLiberacao || null,
      advanceAprovadorId: report.advance?.aprovadorId || null,
      
      // Totais (Money com 2 campos)
      totalDespesasAmount: report.totalDespesas.amount.toFixed(2),
      totalDespesasCurrency: report.totalDespesas.currency,
      saldoAmount: report.saldo.amount.toFixed(2),
      saldoCurrency: report.saldo.currency,
      
      status: report.status,
      
      submittedAt: report.submittedAt || null,
      reviewerId: report.reviewerId || null,
      reviewedAt: report.reviewedAt || null,
      reviewNotes: report.reviewNotes || null,
      
      payableId: report.payableId || null,
      
      createdAt: report.createdAt,
      createdBy: report.createdBy,
      updatedAt: report.updatedAt,
      updatedBy: report.updatedBy,
      deletedAt: null,
    };
  }

  /**
   * Persistence → Domain
   * DEVE usar reconstitute() (INFRA-006)
   */
  static toDomain(
    persistence: ExpenseReportPersistence,
    items: ExpenseItem[]
  ): Result<ExpenseReport, string> {
    try {
      // Money objects
      const totalDespesasResult = Money.create(
        parseFloat(persistence.totalDespesasAmount),
        persistence.totalDespesasCurrency
      );
      if (Result.isFail(totalDespesasResult)) {
        return Result.fail(totalDespesasResult.error);
      }

      const saldoResult = Money.create(
        parseFloat(persistence.saldoAmount),
        persistence.saldoCurrency
      );
      if (Result.isFail(saldoResult)) {
        return Result.fail(saldoResult.error);
      }

      // Reconstituir Advance se presente
      let advance: Advance | undefined;
      if (
        persistence.advanceValorSolicitadoAmount !== null &&
        persistence.advanceValorSolicitadoCurrency !== null &&
        persistence.advanceDataSolicitacao !== null &&
        persistence.advanceStatusAprovacao !== null
      ) {
        const valorSolicitadoResult = Money.create(
          parseFloat(persistence.advanceValorSolicitadoAmount),
          persistence.advanceValorSolicitadoCurrency
        );
        if (Result.isFail(valorSolicitadoResult)) {
          return Result.fail(valorSolicitadoResult.error);
        }

        let valorAprovado: Money | undefined;
        if (
          persistence.advanceValorAprovadoAmount !== null &&
          persistence.advanceValorAprovadoCurrency !== null
        ) {
          const valorAprovadoResult = Money.create(
            parseFloat(persistence.advanceValorAprovadoAmount),
            persistence.advanceValorAprovadoCurrency
          );
          if (Result.isFail(valorAprovadoResult)) {
            return Result.fail(valorAprovadoResult.error);
          }
          valorAprovado = valorAprovadoResult.value;
        }

        const advanceProps: AdvanceProps = {
          valorSolicitado: valorSolicitadoResult.value,
          dataSolicitacao: persistence.advanceDataSolicitacao,
          statusAprovacao: persistence.advanceStatusAprovacao as unknown,
          valorAprovado,
          dataLiberacao: persistence.advanceDataLiberacao || undefined,
          aprovadorId: persistence.advanceAprovadorId || undefined,
        };

        const advanceResult = Advance.reconstitute(advanceProps);
        if (Result.isFail(advanceResult)) {
          return Result.fail(advanceResult.error);
        }
        advance = advanceResult.value;
      }

      // Reconstituir props
      const props: ExpenseReportProps = {
        id: persistence.id,
        organizationId: persistence.organizationId,
        branchId: persistence.branchId,
        
        employeeId: persistence.employeeId,
        employeeName: persistence.employeeName,
        costCenterId: persistence.costCenterId,
        
        periodoInicio: persistence.periodoInicio,
        periodoFim: persistence.periodoFim,
        motivo: persistence.motivo,
        projeto: persistence.projeto || undefined,
        
        advance,
        
        items,
        
        totalDespesas: totalDespesasResult.value,
        saldo: saldoResult.value,
        
        status: persistence.status as ExpenseReportStatus,
        
        submittedAt: persistence.submittedAt || undefined,
        reviewerId: persistence.reviewerId || undefined,
        reviewedAt: persistence.reviewedAt || undefined,
        reviewNotes: persistence.reviewNotes || undefined,
        
        payableId: persistence.payableId || undefined,
        
        createdAt: persistence.createdAt,
        createdBy: persistence.createdBy,
        updatedAt: persistence.updatedAt,
        updatedBy: persistence.updatedBy,
      };

      // Usar reconstitute, NÃO create (INFRA-006)
      return ExpenseReport.reconstitute(
        props,
        persistence.createdAt,
        persistence.updatedAt
      );
    } catch (error) {
      return Result.fail(`Failed to map expense report from persistence: ${(error as Error).message}`);
    }
  }

  /**
   * Item Domain → Persistence
   */
  static itemToPersistence(item: ExpenseItem): ExpenseItemPersistence {
    return {
      id: item.id,
      expenseReportId: item.expenseReportId,
      
      categoria: item.categoria,
      data: item.data,
      descricao: item.descricao,
      
      valorAmount: item.valor.amount.toFixed(2),
      valorCurrency: item.valor.currency,
      
      comprovanteType: item.comprovanteType || null,
      comprovanteNumero: item.comprovanteNumero || null,
      comprovanteUrl: item.comprovanteUrl || null,
      
      dentroPolitica: item.dentroPolitica,
      motivoViolacao: item.motivoViolacao || null,
    };
  }

  /**
   * Item Persistence → Domain
   * DEVE usar reconstitute() (INFRA-006)
   */
  static itemToDomain(persistence: ExpenseItemPersistence): Result<ExpenseItem, string> {
    try {
      const valorResult = Money.create(
        parseFloat(persistence.valorAmount),
        persistence.valorCurrency
      );
      if (Result.isFail(valorResult)) {
        return Result.fail(valorResult.error);
      }

      const props: ExpenseItemProps = {
        id: persistence.id,
        expenseReportId: persistence.expenseReportId,
        
        categoria: persistence.categoria as ExpenseCategory,
        data: persistence.data,
        descricao: persistence.descricao,
        
        valor: valorResult.value,
        
        comprovanteType: persistence.comprovanteType !== null
          ? (persistence.comprovanteType as ComprovanteType)
          : undefined,
        comprovanteNumero: persistence.comprovanteNumero || undefined,
        comprovanteUrl: persistence.comprovanteUrl || undefined,
        
        dentroPolitica: persistence.dentroPolitica,
        motivoViolacao: persistence.motivoViolacao || undefined,
      };

      // Usar reconstitute, NÃO create (INFRA-006)
      return ExpenseItem.reconstitute(props);
    } catch (error) {
      return Result.fail(`Failed to map expense item from persistence: ${(error as Error).message}`);
    }
  }
}

