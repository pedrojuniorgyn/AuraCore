/**
 * @module agent/workflows
 * @description Workflows LangGraph para orquestração de tarefas complexas
 * 
 * Workflows são fluxos de trabalho que combinam múltiplas tools e decisões
 * para realizar tarefas complexas como:
 * - Importar NFe de email e contabilizar automaticamente
 * - Conciliar extrato e gerar relatório
 * - Processar lote de documentos fiscais
 */

// Tipos
export * from './types';

// Workflows
export { FiscalImportWorkflow, type FiscalImportInput } from './FiscalImportWorkflow';

/**
 * Estado base para workflows (compatibilidade)
 */
export interface WorkflowState {
  /** ID do workflow */
  workflowId: string;
  /** Mensagens do chat */
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Próximo passo */
  nextStep?: string;
  /** Dados acumulados */
  data: Record<string, unknown>;
  /** Erros encontrados */
  errors: string[];
  /** Workflow finalizado? */
  finished: boolean;
}

/**
 * Resultado de execução de workflow (compatibilidade)
 */
export interface WorkflowResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  steps: string[];
}

// TODO: Implementar workflows adicionais:
// - BankReconciliationWorkflow - Conciliação bancária automática
// - BatchImportWorkflow - Importação em lote
// - ReportGenerationWorkflow - Geração de relatórios
