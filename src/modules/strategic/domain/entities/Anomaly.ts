/**
 * Entity: Anomaly
 * Desvio não desejado que requer tratamento (Metodologia GEROT/Falconi)
 * Inclui análise de causa raiz com 5 Porquês
 * 
 * @module strategic/domain/entities
 */
import { AggregateRoot, Result } from '@/shared/domain';

export type AnomalyStatus = 'OPEN' | 'ANALYZING' | 'IN_TREATMENT' | 'RESOLVED' | 'CANCELLED';
export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AnomalySource = 'CONTROL_ITEM' | 'KPI' | 'MANUAL' | 'AUDIT';

interface AnomalyProps {
  organizationId: number;
  branchId: number;
  code: string;
  title: string;
  description: string;
  source: AnomalySource;
  sourceEntityId: string | null;
  detectedAt: Date;
  detectedBy: string;
  severity: AnomalySeverity;
  processArea: string;
  responsibleUserId: string;
  status: AnomalyStatus;
  
  // Análise de causa raiz (5 Porquês)
  rootCauseAnalysis: string | null;
  why1: string | null;
  why2: string | null;
  why3: string | null;
  why4: string | null;
  why5: string | null;
  rootCause: string | null;
  
  // Tratamento
  actionPlanId: string | null;
  standardProcedureId: string | null;
  
  // Resolução
  resolution: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

interface CreateAnomalyProps {
  organizationId: number;
  branchId: number;
  title: string;
  description: string;
  source: AnomalySource;
  sourceEntityId?: string;
  severity: AnomalySeverity;
  processArea: string;
  responsibleUserId: string;
  detectedBy: string;
}

export class Anomaly extends AggregateRoot<string> {
  private constructor(id: string, private readonly props: AnomalyProps) {
    super(id);
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get code(): string { return this.props.code; }
  get title(): string { return this.props.title; }
  get description(): string { return this.props.description; }
  get source(): AnomalySource { return this.props.source; }
  get sourceEntityId(): string | null { return this.props.sourceEntityId; }
  get detectedAt(): Date { return this.props.detectedAt; }
  get detectedBy(): string { return this.props.detectedBy; }
  get severity(): AnomalySeverity { return this.props.severity; }
  get processArea(): string { return this.props.processArea; }
  get responsibleUserId(): string { return this.props.responsibleUserId; }
  get status(): AnomalyStatus { return this.props.status; }
  get rootCauseAnalysis(): string | null { return this.props.rootCauseAnalysis; }
  get why1(): string | null { return this.props.why1; }
  get why2(): string | null { return this.props.why2; }
  get why3(): string | null { return this.props.why3; }
  get why4(): string | null { return this.props.why4; }
  get why5(): string | null { return this.props.why5; }
  get rootCause(): string | null { return this.props.rootCause; }
  get actionPlanId(): string | null { return this.props.actionPlanId; }
  get standardProcedureId(): string | null { return this.props.standardProcedureId; }
  get resolution(): string | null { return this.props.resolution; }
  get resolvedAt(): Date | null { return this.props.resolvedAt; }
  get resolvedBy(): string | null { return this.props.resolvedBy; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  /**
   * Calcula dias desde a detecção
   */
  get daysOpen(): number {
    const endDate = this.props.resolvedAt ?? new Date();
    return Math.floor(
      (endDate.getTime() - this.props.detectedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  /**
   * Verifica se a anomalia está aberta
   */
  isOpen(): boolean {
    return this.props.status !== 'RESOLVED' && this.props.status !== 'CANCELLED';
  }

  /**
   * Verifica se tem análise de causa raiz
   */
  hasRootCauseAnalysis(): boolean {
    return this.props.why1 !== null && this.props.why2 !== null;
  }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateAnomalyProps): Result<Anomaly, string> {
    if (!props.organizationId) return Result.fail('organizationId é obrigatório');
    if (!props.branchId) return Result.fail('branchId é obrigatório');
    if (!props.title?.trim()) return Result.fail('Título é obrigatório');
    if (!props.description?.trim()) return Result.fail('Descrição é obrigatória');
    if (!props.processArea?.trim()) return Result.fail('Área do processo é obrigatória');
    if (!props.responsibleUserId) return Result.fail('Responsável é obrigatório');
    if (!props.detectedBy) return Result.fail('detectedBy é obrigatório');

    const id = globalThis.crypto.randomUUID();
    const now = new Date();
    const code = `ANO-${now.getFullYear()}-${id.substring(0, 4).toUpperCase()}`;

    return Result.ok(new Anomaly(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      code,
      title: props.title.trim(),
      description: props.description.trim(),
      source: props.source,
      sourceEntityId: props.sourceEntityId ?? null,
      detectedAt: now,
      detectedBy: props.detectedBy,
      severity: props.severity,
      processArea: props.processArea.trim(),
      responsibleUserId: props.responsibleUserId,
      status: 'OPEN',
      rootCauseAnalysis: null,
      why1: null,
      why2: null,
      why3: null,
      why4: null,
      why5: null,
      rootCause: null,
      actionPlanId: null,
      standardProcedureId: null,
      resolution: null,
      resolvedAt: null,
      resolvedBy: null,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: AnomalyProps & { id: string }): Result<Anomaly, string> {
    return Result.ok(new Anomaly(props.id, props));
  }

  // Métodos de negócio

  /**
   * Inicia análise de causa raiz
   */
  startAnalysis(): Result<void, string> {
    if (this.props.status !== 'OPEN') {
      return Result.fail('Anomalia deve estar aberta para iniciar análise');
    }
    (this.props as { status: AnomalyStatus }).status = 'ANALYZING';
    (this.props as { updatedAt: Date }).updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Registra análise de causa raiz (5 Porquês)
   */
  registerRootCauseAnalysis(
    why1: string,
    why2: string,
    why3?: string,
    why4?: string,
    why5?: string,
    rootCause?: string
  ): Result<void, string> {
    if (this.props.status !== 'ANALYZING' && this.props.status !== 'OPEN') {
      return Result.fail('Anomalia deve estar aberta ou em análise');
    }
    
    if (!why1?.trim()) return Result.fail('Primeiro "porquê" é obrigatório');
    if (!why2?.trim()) return Result.fail('Segundo "porquê" é obrigatório');
    
    (this.props as { why1: string | null }).why1 = why1.trim();
    (this.props as { why2: string | null }).why2 = why2.trim();
    (this.props as { why3: string | null }).why3 = why3?.trim() ?? null;
    (this.props as { why4: string | null }).why4 = why4?.trim() ?? null;
    (this.props as { why5: string | null }).why5 = why5?.trim() ?? null;
    
    // Determina causa raiz (última resposta não vazia ou fornecida explicitamente)
    const calculatedRootCause = rootCause?.trim() ?? 
      why5?.trim() ?? why4?.trim() ?? why3?.trim() ?? why2.trim();
    (this.props as { rootCause: string | null }).rootCause = calculatedRootCause;
    
    // Monta análise formatada
    const lines = [`1. ${why1.trim()}`, `2. ${why2.trim()}`];
    if (why3?.trim()) lines.push(`3. ${why3.trim()}`);
    if (why4?.trim()) lines.push(`4. ${why4.trim()}`);
    if (why5?.trim()) lines.push(`5. ${why5.trim()}`);
    (this.props as { rootCauseAnalysis: string | null }).rootCauseAnalysis = lines.join('\n');
    
    (this.props as { status: AnomalyStatus }).status = 'ANALYZING';
    (this.props as { updatedAt: Date }).updatedAt = new Date();
    
    return Result.ok(undefined);
  }

  /**
   * Vincula a um plano de ação
   */
  linkActionPlan(actionPlanId: string): Result<void, string> {
    if (!actionPlanId) return Result.fail('actionPlanId é obrigatório');
    
    (this.props as { actionPlanId: string | null }).actionPlanId = actionPlanId;
    (this.props as { status: AnomalyStatus }).status = 'IN_TREATMENT';
    (this.props as { updatedAt: Date }).updatedAt = new Date();
    
    return Result.ok(undefined);
  }

  /**
   * Vincula a um procedimento padrão
   */
  linkStandardProcedure(procedureId: string): Result<void, string> {
    if (!procedureId) return Result.fail('procedureId é obrigatório');
    
    (this.props as { standardProcedureId: string | null }).standardProcedureId = procedureId;
    (this.props as { updatedAt: Date }).updatedAt = new Date();
    
    return Result.ok(undefined);
  }

  /**
   * Resolve a anomalia
   */
  resolve(resolution: string, resolvedBy: string): Result<void, string> {
    if (this.props.status === 'RESOLVED') {
      return Result.fail('Anomalia já está resolvida');
    }
    if (this.props.status === 'CANCELLED') {
      return Result.fail('Anomalia está cancelada');
    }
    if (!resolution?.trim()) return Result.fail('Resolução é obrigatória');
    if (!resolvedBy) return Result.fail('resolvedBy é obrigatório');
    
    (this.props as { resolution: string | null }).resolution = resolution.trim();
    (this.props as { resolvedAt: Date | null }).resolvedAt = new Date();
    (this.props as { resolvedBy: string | null }).resolvedBy = resolvedBy;
    (this.props as { status: AnomalyStatus }).status = 'RESOLVED';
    (this.props as { updatedAt: Date }).updatedAt = new Date();
    
    // Evento de resolução será emitido pelo Use Case
    
    return Result.ok(undefined);
  }

  /**
   * Cancela a anomalia
   */
  cancel(reason: string): Result<void, string> {
    if (this.props.status === 'RESOLVED' || this.props.status === 'CANCELLED') {
      return Result.fail('Anomalia já está finalizada');
    }
    if (!reason?.trim()) return Result.fail('Motivo do cancelamento é obrigatório');
    
    (this.props as { resolution: string | null }).resolution = `CANCELADA: ${reason.trim()}`;
    (this.props as { status: AnomalyStatus }).status = 'CANCELLED';
    (this.props as { updatedAt: Date }).updatedAt = new Date();
    
    return Result.ok(undefined);
  }

  /**
   * Atualiza a severidade
   */
  updateSeverity(severity: AnomalySeverity): Result<void, string> {
    if (!this.isOpen()) {
      return Result.fail('Não é possível alterar severidade de anomalia finalizada');
    }
    
    (this.props as { severity: AnomalySeverity }).severity = severity;
    (this.props as { updatedAt: Date }).updatedAt = new Date();
    
    return Result.ok(undefined);
  }
}
