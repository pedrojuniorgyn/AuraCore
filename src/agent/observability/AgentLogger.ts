/**
 * @module agent/observability/AgentLogger
 * @description Logger centralizado para o Agente AuraCore
 * 
 * Fornece logging estruturado com níveis, componentes e métricas.
 */

/**
 * Componente do agente que gerou o log
 */
export type AgentComponent = 'agent' | 'tool' | 'workflow' | 'voice';

/**
 * Nível de log
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Entrada de log do agente
 */
export interface AgentLogEntry {
  /** Timestamp do log */
  timestamp: Date;
  /** Nível do log */
  level: LogLevel;
  /** Componente que gerou o log */
  component: AgentComponent;
  /** Ação sendo executada */
  action: string;
  /** Detalhes adicionais */
  details: Record<string, unknown>;
  /** Duração em ms (se aplicável) */
  durationMs?: number;
  /** ID do usuário (se disponível) */
  userId?: string;
  /** ID da organização (se disponível) */
  organizationId?: number;
  /** ID da filial (se disponível) */
  branchId?: number;
  /** ID de correlação para rastreamento */
  correlationId?: string;
}

/**
 * Input para criar log (sem timestamp)
 */
export type LogInput = Omit<AgentLogEntry, 'timestamp'>;

/**
 * Métricas do agente
 */
export interface AgentMetrics {
  /** Total de logs armazenados */
  totalLogs: number;
  /** Logs na última hora */
  logsLastHour: number;
  /** Contagem de erros na última hora */
  errorCount: number;
  /** Logs por componente na última hora */
  byComponent: Record<AgentComponent, number>;
  /** Tempo médio de execução por componente (ms) */
  avgDurationByComponent: Record<AgentComponent, number>;
}

/**
 * Configuração do logger
 */
export interface AgentLoggerConfig {
  /** Número máximo de logs a manter */
  maxLogs?: number;
  /** Nível mínimo de log */
  minLevel?: LogLevel;
  /** Habilitar console output */
  enableConsole?: boolean;
}

/**
 * Ordem dos níveis de log
 */
const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger centralizado para o Agente AuraCore
 * 
 * @example
 * ```typescript
 * agentLogger.log({
 *   level: 'info',
 *   component: 'tool',
 *   action: 'ImportNFeTool.execute',
 *   details: { source: 'email', messageId: '123' },
 *   durationMs: 1500,
 * });
 * ```
 */
export class AgentLogger {
  private logs: AgentLogEntry[] = [];
  private readonly config: Required<AgentLoggerConfig>;

  constructor(config: AgentLoggerConfig = {}) {
    this.config = {
      maxLogs: config.maxLogs ?? 1000,
      minLevel: config.minLevel ?? 'debug',
      enableConsole: config.enableConsole ?? true,
    };
  }

  /**
   * Registra um log
   */
  log(entry: LogInput): void {
    // Verificar nível mínimo
    if (LOG_LEVEL_ORDER[entry.level] < LOG_LEVEL_ORDER[this.config.minLevel]) {
      return;
    }

    const fullEntry: AgentLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    this.logs.push(fullEntry);

    // Rotacionar logs se necessário
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs);
    }

    // Console output
    if (this.config.enableConsole) {
      this.writeToConsole(fullEntry);
    }
  }

  /**
   * Log de nível debug
   */
  debug(component: AgentComponent, action: string, details: Record<string, unknown> = {}): void {
    this.log({ level: 'debug', component, action, details });
  }

  /**
   * Log de nível info
   */
  info(component: AgentComponent, action: string, details: Record<string, unknown> = {}): void {
    this.log({ level: 'info', component, action, details });
  }

  /**
   * Log de nível warn
   */
  warn(component: AgentComponent, action: string, details: Record<string, unknown> = {}): void {
    this.log({ level: 'warn', component, action, details });
  }

  /**
   * Log de nível error
   */
  error(component: AgentComponent, action: string, details: Record<string, unknown> = {}): void {
    this.log({ level: 'error', component, action, details });
  }

  /**
   * Inicia um timer para medir duração
   */
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  /**
   * Retorna logs recentes
   */
  getRecentLogs(count = 100): AgentLogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Retorna logs por componente
   */
  getLogsByComponent(component: AgentComponent): AgentLogEntry[] {
    return this.logs.filter(l => l.component === component);
  }

  /**
   * Retorna logs por nível
   */
  getLogsByLevel(level: LogLevel): AgentLogEntry[] {
    return this.logs.filter(l => l.level === level);
  }

  /**
   * Retorna logs por correlationId
   */
  getLogsByCorrelationId(correlationId: string): AgentLogEntry[] {
    return this.logs.filter(l => l.correlationId === correlationId);
  }

  /**
   * Calcula métricas do agente
   */
  getMetrics(): AgentMetrics {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentLogs = this.logs.filter(l => l.timestamp.getTime() > oneHourAgo);

    // Contagem por componente
    const byComponent: Record<AgentComponent, number> = {
      agent: 0,
      tool: 0,
      workflow: 0,
      voice: 0,
    };

    // Soma de duração por componente
    const durationSum: Record<AgentComponent, number> = {
      agent: 0,
      tool: 0,
      workflow: 0,
      voice: 0,
    };

    const durationCount: Record<AgentComponent, number> = {
      agent: 0,
      tool: 0,
      workflow: 0,
      voice: 0,
    };

    for (const log of recentLogs) {
      byComponent[log.component]++;
      if (log.durationMs !== undefined) {
        durationSum[log.component] += log.durationMs;
        durationCount[log.component]++;
      }
    }

    // Calcular média de duração
    const avgDurationByComponent: Record<AgentComponent, number> = {
      agent: durationCount.agent > 0 ? durationSum.agent / durationCount.agent : 0,
      tool: durationCount.tool > 0 ? durationSum.tool / durationCount.tool : 0,
      workflow: durationCount.workflow > 0 ? durationSum.workflow / durationCount.workflow : 0,
      voice: durationCount.voice > 0 ? durationSum.voice / durationCount.voice : 0,
    };

    return {
      totalLogs: this.logs.length,
      logsLastHour: recentLogs.length,
      errorCount: recentLogs.filter(l => l.level === 'error').length,
      byComponent,
      avgDurationByComponent,
    };
  }

  /**
   * Limpa todos os logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Escreve log no console
   */
  private writeToConsole(entry: AgentLogEntry): void {
    const prefix = `[${entry.component.toUpperCase()}]`;
    const timestamp = entry.timestamp.toISOString();
    const message = `${timestamp} ${prefix} ${entry.action}`;
    const details = entry.durationMs 
      ? { ...entry.details, durationMs: entry.durationMs }
      : entry.details;

    switch (entry.level) {
      case 'debug':
        console.debug(message, details);
        break;
      case 'info':
        console.info(message, details);
        break;
      case 'warn':
        console.warn(message, details);
        break;
      case 'error':
        console.error(message, details);
        break;
    }
  }
}

/**
 * Instância singleton do logger
 */
export const agentLogger = new AgentLogger();
