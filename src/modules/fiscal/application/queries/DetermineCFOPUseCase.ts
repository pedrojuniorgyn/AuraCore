/**
 * 📋 DetermineCFOPUseCase - Query (ARCH-013)
 * 
 * Determina o CFOP correto para uma operação fiscal.
 * Usa CFOPDeterminationService (Domain Service) + ICFOPDeterminationRepository (Output Port).
 * 
 * F3.3: CFOP Determination
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { FISCAL_TOKENS } from '../../infrastructure/di/tokens';
import type { ICFOPDeterminationRepository } from '../../domain/ports/output/ICFOPDeterminationRepository';
import { CFOPDeterminationService, type CFOPDeterminationResult, type CFOPLookupInput } from '../../domain/services/CFOPDeterminationService';

export interface DetermineCFOPInput {
  organizationId: number;
  operationType: string;
  direction?: 'ENTRY' | 'EXIT';
  scope?: 'INTRASTATE' | 'INTERSTATE' | 'FOREIGN';
  /** UF de origem (para inferir scope automaticamente) */
  originUf?: string;
  /** UF de destino (para inferir scope automaticamente) */
  destUf?: string;
  taxRegime?: string;
  documentType?: string;
}

export interface DetermineCFOPOutput extends CFOPDeterminationResult {
  /** Se scope/direction foram inferidos automaticamente */
  inferred: {
    direction?: boolean;
    scope?: boolean;
  };
}

@injectable()
export class DetermineCFOPUseCase {
  constructor(
    @inject(FISCAL_TOKENS.CFOPDeterminationRepository)
    private readonly cfopRepo: ICFOPDeterminationRepository
  ) {}

  async execute(input: DetermineCFOPInput): Promise<Result<DetermineCFOPOutput, string>> {
    const inferred: DetermineCFOPOutput['inferred'] = {};

    // 1. Inferir direction se não fornecido
    let direction = input.direction;
    if (!direction) {
      direction = CFOPDeterminationService.inferDirection(input.operationType);
      inferred.direction = true;
    }

    // 2. Inferir scope se não fornecido
    let scope = input.scope;
    if (!scope) {
      if (input.originUf && input.destUf) {
        scope = CFOPDeterminationService.inferScope(input.originUf, input.destUf);
        inferred.scope = true;
      } else {
        scope = 'INTRASTATE'; // Default seguro
        inferred.scope = true;
      }
    }

    // 3. Buscar regras no repositório
    const rules = await this.cfopRepo.findByLookup(
      input.organizationId,
      input.operationType,
      direction,
      scope
    );

    // 4. Determinar CFOP via Domain Service
    const lookupInput: CFOPLookupInput = {
      operationType: input.operationType,
      direction,
      scope,
      taxRegime: input.taxRegime,
      documentType: input.documentType,
    };

    const result = CFOPDeterminationService.determine(lookupInput, rules);
    if (Result.isFail(result)) {
      return Result.fail(result.error);
    }

    return Result.ok({
      ...result.value,
      inferred,
    });
  }
}
