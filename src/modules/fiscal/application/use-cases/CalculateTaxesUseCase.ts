import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';
import { FiscalDocumentNotFoundError } from '../../domain/errors/FiscalErrors';
import { CalculateTaxesInput, CalculateTaxesOutput } from '../dtos';
import { CurrentTaxEngine } from '../../domain/tax/engines/CurrentTaxEngine';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

/**
 * Use Case: Calculate Taxes for Fiscal Document
 *
 * Calcula todos os impostos aplicáveis a um documento fiscal usando
 * o motor tributário brasileiro (ICMS, IPI, PIS, COFINS, ISS).
 *
 * Este Use Case integra:
 * - Domain Layer: FiscalDocument aggregate
 * - Tax Engine: CurrentTaxEngine com 5 calculators
 *
 * Estratégia:
 * 1. Buscar documento fiscal
 * 2. Para cada item, calcular impostos usando Tax Engine
 * 3. Agregar resultados
 * 4. Retornar DTO com breakdown de impostos
 */
@injectable()
export class CalculateTaxesUseCase implements IUseCaseWithContext<CalculateTaxesInput, CalculateTaxesOutput> {
  private taxEngine = new CurrentTaxEngine();

  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private repository: IFiscalDocumentRepository
  ) {}

  async execute(
    input: CalculateTaxesInput,
    context: ExecutionContext
  ): Promise<Result<CalculateTaxesOutput, string>> {
    try {
      // Buscar documento
      const document = await this.repository.findById(input.fiscalDocumentId, context.organizationId);
      if (!document) {
        return Result.fail(new FiscalDocumentNotFoundError(input.fiscalDocumentId).message);
      }

      // Validar branch (admin pode acessar qualquer branch)
      if (!context.isAdmin && document.branchId !== context.branchId) {
        return Result.fail('You do not have permission to access this fiscal document');
      }

      // TODO: Implementação completa do cálculo de impostos
      // Para E7.4 Semana 3, retornar estrutura básica
      // A implementação completa será feita quando integrarmos com o motor tributário
      
      // Por ora, retornar estrutura vazia
      const output: CalculateTaxesOutput = {
        fiscalDocumentId: document.id,
        totalTaxes: 0,
        taxes: {},
      };

      return Result.ok(output);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Failed to calculate taxes: ${errorMessage}`);
    }
  }
}

