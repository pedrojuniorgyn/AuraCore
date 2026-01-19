/**
 * Domain Service: AgendaGeneratorService
 * Gera pautas automáticas para reuniões (100% stateless)
 * 
 * @module strategic/domain/services
 */
import { Result } from '@/shared/domain';

export type MeetingType = 'BOARD' | 'DIRECTOR' | 'MANAGER';

export interface AgendaItem {
  type: 'FIXED' | 'AUTOMATIC';
  title: string;
  description: string;
  duration: number; // minutos
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sourceType?: string;
  sourceEntityId?: string;
  presenter?: string;
}

export interface AgendaSource {
  type: 'KPI_CRITICAL' | 'KPI_ALERT' | 'ACTION_PLAN_OVERDUE' | 'GOAL_DEVIATION' | 'IDEA_PENDING' | 'FOLLOWUP_PROBLEM';
  entityId: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  daysPending?: number;
}

export interface RecurringItem {
  title: string;
  description: string;
  duration: number;
  frequency: 'EVERY' | 'FIRST_OF_MONTH' | 'LAST_OF_MONTH' | 'WEEKLY';
  meetingTypes: MeetingType[];
  presenter?: string;
  orderIndex: number;
}

export interface GeneratedAgenda {
  items: AgendaItem[];
  totalDuration: number;
  generatedAt: Date;
  warnings: string[];
}

export class AgendaGeneratorService {
  private constructor() {}

  /**
   * Gera pauta combinando itens fixos e automáticos
   */
  static generateAgenda(
    meetingType: MeetingType,
    meetingDate: Date,
    recurringItems: RecurringItem[],
    automaticSources: AgendaSource[]
  ): Result<GeneratedAgenda, string> {
    const agenda: AgendaItem[] = [];
    const warnings: string[] = [];

    // 1. Adicionar itens fixos aplicáveis
    const applicableRecurring = recurringItems.filter((item) =>
      item.meetingTypes.includes(meetingType) &&
      this.shouldIncludeRecurring(item, meetingDate)
    );

    for (const item of applicableRecurring.sort((a, b) => a.orderIndex - b.orderIndex)) {
      agenda.push({
        type: 'FIXED',
        title: item.title,
        description: item.description,
        duration: item.duration,
        priority: 'MEDIUM',
        presenter: item.presenter,
      });
    }

    // 2. Adicionar itens automáticos por prioridade
    const sortedSources = [...automaticSources].sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const source of sortedSources) {
      // Definir duração baseada no tipo e prioridade
      let duration = 5; // minutos
      if (source.priority === 'CRITICAL') duration = 15;
      else if (source.priority === 'HIGH') duration = 10;

      // Adicionar contexto ao título
      let title = source.title;
      if (source.daysPending && source.daysPending > 7) {
        title = `⚠️ ${title} (${source.daysPending} dias)`;
      }

      agenda.push({
        type: 'AUTOMATIC',
        title,
        description: source.description,
        duration,
        priority: source.priority,
        sourceType: source.type,
        sourceEntityId: source.entityId,
      });
    }

    // 3. Calcular tempo total
    const totalDuration = agenda.reduce((sum, item) => sum + item.duration, 0);

    // 4. Verificar se excede tempo típico
    const typicalDurations: Record<MeetingType, number> = {
      BOARD: 120,
      DIRECTOR: 90,
      MANAGER: 60,
    };

    if (totalDuration > typicalDurations[meetingType]) {
      warnings.push(
        `Pauta com ${totalDuration}min excede o tempo típico de ${typicalDurations[meetingType]}min para reuniões ${meetingType}`
      );
    }

    return Result.ok({
      items: agenda,
      totalDuration,
      generatedAt: new Date(),
      warnings,
    });
  }

  private static shouldIncludeRecurring(
    item: RecurringItem,
    meetingDate: Date
  ): boolean {
    if (item.frequency === 'EVERY') return true;

    const dayOfMonth = meetingDate.getDate();
    const lastDayOfMonth = new Date(
      meetingDate.getFullYear(),
      meetingDate.getMonth() + 1,
      0
    ).getDate();

    if (item.frequency === 'FIRST_OF_MONTH' && dayOfMonth <= 7) return true;
    if (item.frequency === 'LAST_OF_MONTH' && dayOfMonth >= lastDayOfMonth - 7) return true;
    if (item.frequency === 'WEEKLY') return true;

    return false;
  }

  /**
   * Itens recorrentes padrão
   */
  static getDefaultRecurringItems(): RecurringItem[] {
    return [
      {
        title: 'Abertura e Aprovação da Ata Anterior',
        description: 'Verificar pendências da reunião anterior',
        duration: 5,
        frequency: 'EVERY',
        meetingTypes: ['BOARD', 'DIRECTOR', 'MANAGER'],
        orderIndex: 1,
      },
      {
        title: 'Revisão de KPIs Estratégicos',
        description: 'Análise dos principais indicadores',
        duration: 15,
        frequency: 'EVERY',
        meetingTypes: ['BOARD', 'DIRECTOR'],
        orderIndex: 2,
      },
      {
        title: 'Status de Planos de Ação',
        description: 'Verificar progresso e bloqueios',
        duration: 10,
        frequency: 'EVERY',
        meetingTypes: ['DIRECTOR', 'MANAGER'],
        orderIndex: 3,
      },
      {
        title: 'Análise de Resultados Mensais',
        description: 'Fechamento do mês anterior',
        duration: 20,
        frequency: 'FIRST_OF_MONTH',
        meetingTypes: ['BOARD'],
        orderIndex: 4,
      },
      {
        title: 'Encerramento e Definição de Próximos Passos',
        description: 'Registro de decisões e compromissos',
        duration: 5,
        frequency: 'EVERY',
        meetingTypes: ['BOARD', 'DIRECTOR', 'MANAGER'],
        orderIndex: 99,
      },
    ];
  }
}
