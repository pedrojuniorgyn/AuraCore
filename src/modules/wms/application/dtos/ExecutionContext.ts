/**
 * ExecutionContext - E7.8 WMS Semana 2
 * 
 * Contexto de execução para multi-tenancy e rastreabilidade
 */
export interface ExecutionContext {
  userId: string;
  organizationId: number;
  branchId: number;
  isAdmin: boolean;
}

