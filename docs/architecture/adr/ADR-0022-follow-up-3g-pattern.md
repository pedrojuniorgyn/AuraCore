# ADR-0022: Padrão Follow-up 3G (Metodologia Falconi)

## Status

Proposto

## Data

2026-01-18

## Contexto

A validação de execução de planos de ação requer verificação in loco para garantir que as ações foram realmente executadas, não apenas marcadas como "concluídas" no sistema.

A metodologia Falconi de Gerenciamento da Rotina (GEROT) estabelece o princípio 3G para validação:

- **GEMBA (現場):** Ir ao local onde acontece
- **GEMBUTSU (現物):** Observar o objeto/processo real
- **GENJITSU (現実):** Basear-se em fatos e dados

Este princípio é fundamental para a melhoria contínua e deve ser implementado no módulo Strategic.

## Decisão

### Entidade ActionPlanFollowUp

```typescript
interface ActionPlanFollowUpProps {
  // Identificação
  organizationId: number;
  branchId: number;
  actionPlanId: string;
  followUpNumber: number;
  followUpDate: Date;
  
  // 3G - GEMBA
  gembaLocal: string; // Onde verificou (ex: "Galpão 3 - Doca de expedição")
  
  // 3G - GEMBUTSU
  gembutsuObservation: string; // O que observou (ex: "Sistema de etiquetas não funcionando")
  
  // 3G - GENJITSU
  genjitsuData: string; // Dados coletados (ex: "3 de 10 pedidos sem etiqueta")
  
  // Resultado da verificação
  executionStatus: ExecutionStatus;
  executionPercent: number; // 0-100
  problemsObserved?: string;
  problemSeverity?: ProblemSeverity; // LOW, MEDIUM, HIGH, CRITICAL
  
  // Reproposição (se necessário)
  requiresNewPlan: boolean;
  newPlanDescription?: string;
  newPlanAssignedTo?: string;
  childActionPlanId?: string; // ID do plano gerado
  
  // Auditoria
  verifiedBy: string; // userId
  verifiedAt: Date;
  evidenceUrls: string[]; // URLs de fotos/documentos
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### Value Object ExecutionStatus

```typescript
class ExecutionStatus extends ValueObject<ExecutionStatusProps> {
  static readonly EXECUTED_OK = new ExecutionStatus({ 
    value: 'EXECUTED_OK', 
    label: 'Executado OK', 
    requiresFollowUp: false,
    requiresEscalation: false
  });
  
  static readonly EXECUTED_PARTIAL = new ExecutionStatus({ 
    value: 'EXECUTED_PARTIAL', 
    label: 'Executado Parcialmente', 
    requiresFollowUp: true,
    requiresEscalation: false
  });
  
  static readonly NOT_EXECUTED = new ExecutionStatus({ 
    value: 'NOT_EXECUTED', 
    label: 'Não Executado', 
    requiresFollowUp: true,
    requiresEscalation: true
  });
  
  static readonly BLOCKED = new ExecutionStatus({ 
    value: 'BLOCKED', 
    label: 'Bloqueado', 
    requiresFollowUp: true,
    requiresEscalation: true
  });
  
  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get requiresFollowUp(): boolean { return this.props.requiresFollowUp; }
  get requiresEscalation(): boolean { return this.props.requiresEscalation; }
}
```

### Fluxo de Reproposição

```
┌─────────────────┐
│  ActionPlan     │
│  (Original)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     Executado OK?     ┌─────────────────┐
│  Follow-up 3G   │─────────────────────▶│  Plano Fechado  │
│  (Verificação)  │         Sim           │  (Sucesso)      │
└────────┬────────┘                       └─────────────────┘
         │
         │ Não / Parcial
         ▼
┌─────────────────┐
│ requiresNewPlan?│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
   Sim       Não
    │         │
    ▼         ▼
┌─────────────────┐     ┌─────────────────┐
│  Reproposição   │     │ Agendar novo    │
│  (Novo Plano)   │     │ Follow-up       │
│  reproposition  │     └─────────────────┘
│  Number + 1     │
└────────┬────────┘
         │
         │ parentActionPlanId = original.id
         ▼
┌─────────────────┐
│  ActionPlan     │
│  (Child)        │
└─────────────────┘
```

### Regras de Reproposição

1. **Limite de reproposições:** Máximo 3 reproposições antes de escalonamento obrigatório
2. **Custo acumulado:** Soma do `howMuchAmount` de todas as reproposições
3. **Responsável:** Pode manter o mesmo ou designar outro
4. **Histórico:** Timeline completa de todas as proposições
5. **Padronização:** Se EXECUTED_OK, verificar necessidade de padronizar

```typescript
// domain/entities/ActionPlan.ts
class ActionPlan extends AggregateRoot<string> {
  static readonly MAX_REPROPOSITIONS = 3;
  
  repropose(
    reason: string,
    assignedTo?: string
  ): Result<ActionPlan, string> {
    if (this.repropositionNumber >= ActionPlan.MAX_REPROPOSITIONS) {
      return Result.fail(
        `Limite de ${ActionPlan.MAX_REPROPOSITIONS} reproposições atingido. ` +
        'Escalonamento obrigatório para gerência superior.'
      );
    }
    
    const newPlan = ActionPlan.create({
      // Herdar dados do plano original
      goalId: this.goalId,
      what: `[REPROPOSIÇÃO] ${this.what}`,
      why: reason,
      where: this.where,
      who: assignedTo || this.who,
      
      // Reproposição
      parentActionPlanId: this.id,
      repropositionNumber: this.repropositionNumber + 1,
      repropositionReason: reason,
      
      // Novo ciclo PDCA
      pdcaCycle: PDCACycle.PLAN,
      completionPercent: 0,
    });
    
    if (newPlan.isFail()) {
      return Result.fail(newPlan.error);
    }
    
    // Emitir evento
    this.addDomainEvent(new RepropositionCreatedEvent(
      this.id,
      newPlan.value.id,
      this.repropositionNumber + 1,
      reason,
      assignedTo || this.who
    ));
    
    return newPlan;
  }
}
```

### Agendamento Automático de Follow-ups

| Tipo | Quando | Ação |
|------|--------|------|
| Lembrete | T-7 dias antes do prazo | Notificação para responsável |
| Follow-up obrigatório | T-0 (data limite) | Marcar como pendente de follow-up |
| Escalonamento | T+7 dias após prazo | Notificar gestor superior |
| Consolidação | T+30 dias | Follow-up final para fechar ou repropos. |

```typescript
// application/jobs/FollowUpSchedulerJob.ts
@injectable()
export class FollowUpSchedulerJob {
  async execute(): Promise<void> {
    const today = new Date();
    
    // Buscar planos que precisam de ação
    const pendingReminders = await this.repo.findPlansNeedingReminder(today, 7);
    const overdueFollowUps = await this.repo.findOverduePlans(today);
    const escalationNeeded = await this.repo.findPlansNeedingEscalation(today, 7);
    
    for (const plan of pendingReminders) {
      await this.notificationService.send({
        userId: plan.who,
        type: 'FOLLOW_UP_REMINDER',
        title: `Lembrete: Follow-up do plano ${plan.code} em 7 dias`,
        actionPlanId: plan.id
      });
    }
    
    for (const plan of overdueFollowUps) {
      this.eventBus.publish(new FollowUpRequiredEvent(
        plan.id,
        'OVERDUE',
        plan.whenEnd,
        plan.who
      ));
    }
    
    for (const plan of escalationNeeded) {
      this.eventBus.publish(new FollowUpRequiredEvent(
        plan.id,
        'ESCALATION',
        plan.whenEnd,
        plan.who
      ));
    }
  }
}
```

### Padronização Pós-Execução

Quando um plano de ação é executado com sucesso e resolve um problema recorrente, deve-se avaliar a criação de um Procedimento Operacional Padrão (POP):

```typescript
interface StandardizationProps {
  actionPlanId: string;
  documentType: 'POP' | 'IT' | 'FT'; // Procedimento, Instrução de Trabalho, Folha de Trabalho
  title: string;
  description: string;
  steps: string[];
  responsibleRole: string;
  frequency?: string; // Se for rotina
  attachmentUrls: string[];
  approvedBy?: string;
  approvedAt?: Date;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'OBSOLETE';
}
```

## Consequências

### Positivas

1. **Validação real da execução**
   - Não é apenas check no sistema
   - Exige presença no local
   - Coleta de evidências

2. **Rastreabilidade completa**
   - Histórico de reproposições
   - Timeline de execução
   - Custo acumulado

3. **Base para melhoria contínua**
   - Alimenta ciclo PDCA
   - Gera padronização
   - Identifica gaps recorrentes

4. **Accountability**
   - Responsável identificado
   - Escalonamento automático
   - Evidências obrigatórias

### Negativas

1. **Requer disciplina da equipe**
   - Ir ao local é obrigatório
   - Preenchimento completo dos campos
   - Upload de evidências

2. **Overhead de registro**
   - Tempo para preencher 3G
   - Pode parecer burocrático
   - Curva de aprendizado

3. **Dependência de cultura organizacional**
   - Precisa de buy-in da liderança
   - Resistência natural a controles

## Referências

- FALCONI, V. *Gerenciamento da Rotina do Trabalho do Dia-a-dia*. INDG, 2004.
- FALCONI, V. *TQC Controle da Qualidade Total*. INDG, 1992.
- IMAI, M. *Gemba Kaizen*. McGraw-Hill, 1997.
- ADR-0020: Módulo Strategic Management
