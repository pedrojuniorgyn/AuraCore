/**
 * Entity: ActionPlanFollowUp (3G - Falconi)
 * GEMBA/GEMBUTSU/GENJITSU - Verificação in loco
 * 
 * @module strategic/domain/entities
 * @see ADR-0022
 */
import { Entity, Result } from '@/shared/domain';
import { ExecutionStatus } from '../value-objects/ExecutionStatus';

export type ProblemSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface ActionPlanFollowUpProps {
  actionPlanId: string;
  followUpNumber: number;
  followUpDate: Date;
  
  // 3G (GEMBA/GEMBUTSU/GENJITSU)
  gembaLocal: string;          // 現場 - Onde verificou
  gembutsuObservation: string; // 現物 - O que observou
  genjitsuData: string;        // 現実 - Dados coletados
  
  // Resultado
  executionStatus: ExecutionStatus;
  executionPercent: number;
  problemsObserved: string | null;
  problemSeverity: ProblemSeverity | null;
  
  // Reproposição
  requiresNewPlan: boolean;
  newPlanDescription: string | null;
  newPlanAssignedTo: string | null;
  childActionPlanId: string | null;
  
  // Auditoria
  verifiedBy: string;
  verifiedAt: Date;
  evidenceUrls: string[];
  
  createdAt: Date;
}

interface CreateActionPlanFollowUpProps {
  actionPlanId: string;
  followUpNumber: number;
  followUpDate: Date;
  gembaLocal: string;
  gembutsuObservation: string;
  genjitsuData: string;
  executionStatus: ExecutionStatus;
  executionPercent: number;
  problemsObserved?: string;
  problemSeverity?: ProblemSeverity;
  verifiedBy: string;
  evidenceUrls?: string[];
}

export class ActionPlanFollowUp extends Entity<string> {
  private readonly props: ActionPlanFollowUpProps;

  private constructor(id: string, props: ActionPlanFollowUpProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get actionPlanId(): string { return this.props.actionPlanId; }
  get followUpNumber(): number { return this.props.followUpNumber; }
  get followUpDate(): Date { return this.props.followUpDate; }
  get gembaLocal(): string { return this.props.gembaLocal; }
  get gembutsuObservation(): string { return this.props.gembutsuObservation; }
  get genjitsuData(): string { return this.props.genjitsuData; }
  get executionStatus(): ExecutionStatus { return this.props.executionStatus; }
  get executionPercent(): number { return this.props.executionPercent; }
  get problemsObserved(): string | null { return this.props.problemsObserved; }
  get problemSeverity(): ProblemSeverity | null { return this.props.problemSeverity; }
  get requiresNewPlan(): boolean { return this.props.requiresNewPlan; }
  get newPlanDescription(): string | null { return this.props.newPlanDescription; }
  get newPlanAssignedTo(): string | null { return this.props.newPlanAssignedTo; }
  get childActionPlanId(): string | null { return this.props.childActionPlanId; }
  get verifiedBy(): string { return this.props.verifiedBy; }
  get verifiedAt(): Date { return this.props.verifiedAt; }
  get evidenceUrls(): string[] { return [...this.props.evidenceUrls]; }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateActionPlanFollowUpProps): Result<ActionPlanFollowUp, string> {
    // Validações
    if (!props.actionPlanId) return Result.fail('actionPlanId é obrigatório');
    if (props.followUpNumber < 1) return Result.fail('followUpNumber deve ser >= 1');
    if (!props.followUpDate) return Result.fail('followUpDate é obrigatório');
    if (!props.gembaLocal?.trim()) return Result.fail('gembaLocal é obrigatório (3G)');
    if (!props.gembutsuObservation?.trim()) return Result.fail('gembutsuObservation é obrigatório (3G)');
    if (!props.genjitsuData?.trim()) return Result.fail('genjitsuData é obrigatório (3G)');
    if (!props.executionStatus) return Result.fail('executionStatus é obrigatório');
    if (props.executionPercent < 0 || props.executionPercent > 100) {
      return Result.fail('executionPercent deve estar entre 0 e 100');
    }
    if (!props.verifiedBy) return Result.fail('verifiedBy é obrigatório');

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    const followUp = new ActionPlanFollowUp(id, {
      actionPlanId: props.actionPlanId,
      followUpNumber: props.followUpNumber,
      followUpDate: props.followUpDate,
      gembaLocal: props.gembaLocal.trim(),
      gembutsuObservation: props.gembutsuObservation.trim(),
      genjitsuData: props.genjitsuData.trim(),
      executionStatus: props.executionStatus,
      executionPercent: props.executionPercent,
      problemsObserved: props.problemsObserved?.trim() ?? null,
      problemSeverity: props.problemSeverity ?? null,
      requiresNewPlan: false,
      newPlanDescription: null,
      newPlanAssignedTo: null,
      childActionPlanId: null,
      verifiedBy: props.verifiedBy,
      verifiedAt: now,
      evidenceUrls: props.evidenceUrls ?? [],
      createdAt: now,
    });

    return Result.ok(followUp);
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: ActionPlanFollowUpProps & { id: string }): Result<ActionPlanFollowUp, string> {
    return Result.ok(new ActionPlanFollowUp(props.id, {
      actionPlanId: props.actionPlanId,
      followUpNumber: props.followUpNumber,
      followUpDate: props.followUpDate,
      gembaLocal: props.gembaLocal,
      gembutsuObservation: props.gembutsuObservation,
      genjitsuData: props.genjitsuData,
      executionStatus: props.executionStatus,
      executionPercent: props.executionPercent,
      problemsObserved: props.problemsObserved,
      problemSeverity: props.problemSeverity,
      requiresNewPlan: props.requiresNewPlan,
      newPlanDescription: props.newPlanDescription,
      newPlanAssignedTo: props.newPlanAssignedTo,
      childActionPlanId: props.childActionPlanId,
      verifiedBy: props.verifiedBy,
      verifiedAt: props.verifiedAt,
      evidenceUrls: props.evidenceUrls,
      createdAt: props.createdAt,
    }, props.createdAt));
  }

  // Métodos de negócio

  /**
   * Solicita reproposição do plano (gera novo plano filho)
   */
  requestReproposition(description: string, assignedTo: string): Result<void, string> {
    if (!description?.trim()) return Result.fail('description é obrigatório');
    if (!assignedTo) return Result.fail('assignedTo é obrigatório');

    (this.props as { requiresNewPlan: boolean }).requiresNewPlan = true;
    (this.props as { newPlanDescription: string }).newPlanDescription = description.trim();
    (this.props as { newPlanAssignedTo: string }).newPlanAssignedTo = assignedTo;
    
    return Result.ok(undefined);
  }

  /**
   * Vincula o plano filho gerado pela reproposição
   */
  linkChildActionPlan(childPlanId: string): Result<void, string> {
    if (!this.props.requiresNewPlan) {
      return Result.fail('Este follow-up não requer reproposição');
    }
    if (!childPlanId) return Result.fail('childPlanId é obrigatório');

    (this.props as { childActionPlanId: string }).childActionPlanId = childPlanId;
    
    return Result.ok(undefined);
  }

  /**
   * Adiciona evidência
   */
  addEvidence(url: string): Result<void, string> {
    if (!url?.trim()) return Result.fail('url é obrigatório');
    
    this.props.evidenceUrls.push(url.trim());
    
    return Result.ok(undefined);
  }

  /**
   * Verifica se precisa escalar (baseado no status e severidade)
   */
  get requiresEscalation(): boolean {
    if (this.props.executionStatus.requiresEscalation) return true;
    if (this.props.problemSeverity === 'CRITICAL') return true;
    return false;
  }
}
