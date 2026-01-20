/**
 * IDownloadNfesUseCase - Input Port
 *
 * Interface do caso de uso para download de NFes da SEFAZ (DistribuicaoDFe).
 * Define contrato entre Application e Domain layers.
 *
 * @module fiscal/domain/ports/input
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see E8 Fase 3: Use Cases Orquestradores
 */

import { Result } from '@/shared/domain';

// ============================================================================
// INPUT
// ============================================================================

export interface DownloadNfesInput {
  /** ID da organização (multi-tenant) */
  organizationId: number;
  /** ID da filial (multi-tenant) */
  branchId: number;
  /** ID do usuário executando a ação */
  userId: string;
}

// ============================================================================
// OUTPUT
// ============================================================================

export interface DownloadNfesOutput {
  /** Total de documentos retornados pela SEFAZ */
  totalDocuments: number;
  /** Novo maxNSU (último número sequencial) */
  maxNsu: string;
  /** Resultados do processamento */
  processing: {
    /** Documentos importados com sucesso */
    imported: number;
    /** Documentos duplicados (já existiam) */
    duplicates: number;
    /** Erros durante importação */
    errors: number;
  } | null;
  /** Mensagem de resultado */
  message: string;
}

// ============================================================================
// INTERFACE
// ============================================================================

/**
 * Use Case para download de NFes da SEFAZ.
 *
 * Orquestra:
 * - IBranchRepository (buscar certificado e NSU)
 * - ISefazGateway (consultar DistribuicaoDFe)
 * - SefazDocumentProcessor (processar XMLs)
 * - IFiscalDocumentRepository (persistir)
 */
export interface IDownloadNfesUseCase {
  execute(input: DownloadNfesInput): Promise<Result<DownloadNfesOutput, string>>;
}
