/**
 * @module agent/workflows
 * @description Workflows LangGraph para orquestração de tarefas complexas
 * 
 * Workflows são fluxos de trabalho que combinam múltiplas tools e decisões
 * para realizar tarefas complexas como:
 * - Importar NFe de email e contabilizar automaticamente
 * - Conciliar extrato e gerar relatório
 * - Processar lote de documentos fiscais
 * 
 * Implementação futura com LangGraph.
 */

/**
 * Estado base para workflows
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
 * Resultado de execução de workflow
 */
export interface WorkflowResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  steps: string[];
}

// TODO: Implementar workflows com LangGraph nas próximas fases
// 
// Exemplo de workflow planejado:
// 
// const importNFeWorkflow = new StateGraph<WorkflowState>({
//   channels: {
//     messages: { value: [] },
//     data: { value: {} },
//   },
// })
//   .addNode('search_email', searchEmailNode)
//   .addNode('extract_nfe', extractNFeNode)
//   .addNode('validate', validateNode)
//   .addNode('import', importNode)
//   .addNode('notify', notifyNode)
//   .addEdge('search_email', 'extract_nfe')
//   .addConditionalEdges('extract_nfe', routeByValidation)
//   .addEdge('validate', 'import')
//   .addEdge('import', 'notify');
