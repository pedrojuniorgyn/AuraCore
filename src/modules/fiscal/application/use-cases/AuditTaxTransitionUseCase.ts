import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { 
  AuditTaxTransitionInput,
  AuditTaxTransitionInputSchema,
  AuditTaxTransitionOutput,
} from '../dtos/AuditTaxTransitionDto';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';

/**
 * Use Case: Auditar Transição Tributária
 * 
 * Responsabilidades:
 * - Validar input (Zod)
 * - Registrar auditoria de cálculo de transição
 * - Persistir log de comparação entre regimes
 * - Retornar ID de auditoria
 * 
 * Útil para compliance e rastreabilidade de decisões tributárias.
 * 
 * Nota: Em produção, persistir em tabela de auditoria.
 * Esta versão retorna ID mockado.
 */
@injectable()
export class AuditTaxTransitionUseCase implements IUseCaseWithContext<AuditTaxTransitionInput, AuditTaxTransitionOutput> {
  constructor() {
    // Em produção, injetar IAuditRepository
  }

  async execute(
    input: AuditTaxTransitionInput,
    ctx: ExecutionContext
  ): Promise<Result<AuditTaxTransitionOutput, string>> {
    // 1. Validar input com Zod
    const validation = AuditTaxTransitionInputSchema.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return Result.fail(`Validation failed: ${errors}`);
    }

    const data = validation.data;

    // 2. Verificar multi-tenancy
    if (data.organizationId !== ctx.organizationId || data.branchId !== ctx.branchId) {
      return Result.fail('Access denied: organizationId or branchId mismatch');
    }

    // 3. Validar que calculatedBy não está vazio
    if (data.calculatedBy.trim().length === 0) {
      return Result.fail('calculatedBy must not be empty');
    }

    // 4. Gerar ID de auditoria
    const auditId = crypto.randomUUID();
    const createdAt = new Date();

    // 5. Persistir auditoria (mockado - em produção, salvar no banco)
    // await this.auditRepository.save({
    //   id: auditId,
    //   organizationId: data.organizationId,
    //   branchId: data.branchId,
    //   fiscalDocumentId: data.fiscalDocumentId,
    //   currentTaxes: data.currentTaxes,
    //   newTaxes: data.newTaxes,
    //   calculatedBy: data.calculatedBy,
    //   calculatedAt: createdAt,
    // });

    // 6. Log de auditoria
    console.log(`[AUDIT] Tax transition audit created: ${auditId}`, {
      fiscalDocumentId: data.fiscalDocumentId,
      calculatedBy: data.calculatedBy,
      currentTaxes: data.currentTaxes,
      newTaxes: data.newTaxes,
    });

    return Result.ok({
      auditId,
      createdAt: createdAt.toISOString(),
    });
  }
}

