/**
 * Use Case: ExecuteFollowUpUseCase
 * Registra follow-up 3G (GEMBA/GEMBUTSU/GENJITSU)
 * 
 * CRÍTICO: Esta é a validação real da execução do plano de ação
 * 
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IActionPlanRepository } from '../../domain/ports/output/IActionPlanRepository';
import type { IActionPlanFollowUpRepository } from '../../domain/ports/output/IActionPlanFollowUpRepository';
import { ActionPlanFollowUp, type ProblemSeverity } from '../../domain/entities/ActionPlanFollowUp';
import { ActionPlan } from '../../domain/entities/ActionPlan';
import { ExecutionStatus } from '../../domain/value-objects/ExecutionStatus';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

export interface ExecuteFollowUpInput {
  actionPlanId: string;
  followUpDate: Date;
  
  // 3G (OBRIGATÓRIOS)
  gembaLocal: string;           // Onde você verificou?
  gembutsuObservation: string;  // O que você observou?
  genjitsuData: string;         // Quais dados você coletou?
  
  // Resultado
  executionStatus: 'EXECUTED_OK' | 'EXECUTED_PARTIAL' | 'NOT_EXECUTED' | 'BLOCKED';
  executionPercent: number;
  problemsObserved?: string;
  problemSeverity?: ProblemSeverity;
  
  // Reproposição
  requiresNewPlan?: boolean;
  newPlanDescription?: string;
  newPlanAssignedTo?: string;
  
  // Evidências
  evidenceUrls?: string[];
}

export interface ExecuteFollowUpOutput {
  followUpId: string;
  followUpNumber: number;
  childActionPlanId?: string;
  message: string;
}

export interface IExecuteFollowUpUseCase {
  execute(
    input: ExecuteFollowUpInput,
    context: TenantContext
  ): Promise<Result<ExecuteFollowUpOutput, string>>;
}

@injectable()
export class ExecuteFollowUpUseCase implements IExecuteFollowUpUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.ActionPlanRepository)
    private readonly actionPlanRepository: IActionPlanRepository,
    @inject(STRATEGIC_TOKENS.ActionPlanFollowUpRepository)
    private readonly followUpRepository: IActionPlanFollowUpRepository
  ) {}

  async execute(
    input: ExecuteFollowUpInput,
    context: TenantContext
  ): Promise<Result<ExecuteFollowUpOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    // 2. Validar campos 3G (OBRIGATÓRIOS)
    if (!input.gembaLocal?.trim()) {
      return Result.fail('GEMBA (local de verificação) é obrigatório');
    }
    if (!input.gembutsuObservation?.trim()) {
      return Result.fail('GEMBUTSU (observação) é obrigatório');
    }
    if (!input.genjitsuData?.trim()) {
      return Result.fail('GENJITSU (dados/fatos) é obrigatório');
    }

    // 3. Buscar plano de ação
    const actionPlan = await this.actionPlanRepository.findById(
      input.actionPlanId,
      context.organizationId,
      context.branchId
    );

    if (!actionPlan) {
      return Result.fail('Plano de ação não encontrado');
    }

    // 4. Verificar se plano está em fase que permite follow-up (DO ou CHECK)
    const currentCycle = actionPlan.pdcaCycle.value;
    if (currentCycle !== 'DO' && currentCycle !== 'CHECK') {
      return Result.fail(
        `Follow-up só pode ser registrado nas fases DO ou CHECK. Fase atual: ${currentCycle}`
      );
    }

    // 5. Obter próximo número de follow-up (com validação multi-tenancy)
    const followUpNumber = await this.followUpRepository.getNextFollowUpNumber(
      input.actionPlanId,
      context.organizationId,
      context.branchId
    );

    // 6. Criar ExecutionStatus
    const executionStatusResult = ExecutionStatus.fromValue(input.executionStatus);
    if (Result.isFail(executionStatusResult)) {
      return Result.fail(executionStatusResult.error);
    }

    // 7. Criar follow-up
    const followUpResult = ActionPlanFollowUp.create({
      actionPlanId: input.actionPlanId,
      followUpNumber,
      followUpDate: input.followUpDate,
      gembaLocal: input.gembaLocal.trim(),
      gembutsuObservation: input.gembutsuObservation.trim(),
      genjitsuData: input.genjitsuData.trim(),
      executionStatus: executionStatusResult.value,
      executionPercent: input.executionPercent,
      problemsObserved: input.problemsObserved?.trim(),
      problemSeverity: input.problemSeverity,
      verifiedBy: context.userId,
      evidenceUrls: input.evidenceUrls ?? [],
    });

    if (Result.isFail(followUpResult)) {
      return Result.fail(followUpResult.error);
    }

    const followUp = followUpResult.value;

    // 8. Se requer novo plano (reproposição), criar
    let childActionPlanId: string | undefined;

    if (input.requiresNewPlan && input.newPlanDescription) {
      // Fallback para assignedTo: input > actionPlan.whoUserId > context.userId
      const assignedTo = input.newPlanAssignedTo ?? actionPlan.whoUserId ?? context.userId;

      // Solicitar reproposição no follow-up
      const repropositionRequest = followUp.requestReproposition(
        input.newPlanDescription,
        assignedTo
      );
      
      if (Result.isFail(repropositionRequest)) {
        return Result.fail(repropositionRequest.error);
      }

      // Criar novo plano via reproposição
      const newPlanResult = actionPlan.repropose({
        reason: input.problemsObserved ?? 'Reproposição após follow-up 3G',
        newWhenEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 dias
        newWhoUserId: assignedTo,
        createdBy: context.userId,
      });

      if (Result.isOk(newPlanResult)) {
        childActionPlanId = newPlanResult.value.id;
        
        // Vincular ao follow-up
        const linkResult = followUp.linkChildActionPlan(childActionPlanId);
        if (Result.isFail(linkResult)) {
          return Result.fail(linkResult.error);
        }

        // Persistir novo plano
        await this.actionPlanRepository.save(newPlanResult.value);
      }
    }

    // 9. Persistir follow-up
    await this.followUpRepository.save(followUp);

    // 10. Atualizar progresso do plano original
    const progressResult = actionPlan.updateProgress(input.executionPercent);
    if (Result.isFail(progressResult)) {
      // Log mas não falha - progresso é secundário
      console.warn('Falha ao atualizar progresso:', progressResult.error);
    }

    // 11. Se foi executado OK e >= 100%, avançar para CHECK (se ainda em DO)
    if (input.executionStatus === 'EXECUTED_OK' && input.executionPercent >= 100) {
      if (currentCycle === 'DO') {
        const advanceResult = actionPlan.advancePDCA();
        if (Result.isFail(advanceResult)) {
          console.warn('Falha ao avançar PDCA:', advanceResult.error);
        }
      }
    }

    await this.actionPlanRepository.save(actionPlan);

    // 12. Retornar resultado
    const statusMessages: Record<string, string> = {
      EXECUTED_OK: '✅ Plano executado com sucesso',
      EXECUTED_PARTIAL: '⚠️ Plano parcialmente executado',
      NOT_EXECUTED: '❌ Plano não executado',
      BLOCKED: '🚫 Plano bloqueado',
    };

    return Result.ok({
      followUpId: followUp.id,
      followUpNumber: followUp.followUpNumber,
      childActionPlanId,
      message: statusMessages[input.executionStatus] + 
        (childActionPlanId ? '. Novo plano de ação criado.' : ''),
    });
  }
}
