/**
 * Input Port: Geração de SPED Fiscal (EFD-ICMS/IPI)
 *
 * Define contrato para geração do arquivo SPED Fiscal
 * conforme layout definido pela Receita Federal.
 *
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';

export interface GenerateSpedFiscalInput {
  /** Período no formato MMAAAA (ex: 012026) */
  competencia: string;
  /** Finalidade: ORIGINAL, RETIFICADORA, SUBSTITUTA */
  finalidade: 'ORIGINAL' | 'RETIFICADORA' | 'SUBSTITUTA';
  /** ID do arquivo retificado (obrigatório se finalidade != ORIGINAL) */
  hashRetificado?: string;
}

export interface GenerateSpedFiscalOutput {
  /** Conteúdo do arquivo SPED */
  content: string;
  /** Nome sugerido para o arquivo */
  filename: string;
  /** Hash do arquivo gerado */
  hash: string;
  /** Quantidade de registros */
  totalRegistros: number;
  /** Data/hora da geração */
  geradoEm: Date;
}

export interface ExecutionContext {
  organizationId: number;
  branchId: number;
  userId: string;
}

export interface IGenerateSpedFiscal {
  execute(
    input: GenerateSpedFiscalInput,
    context: ExecutionContext
  ): Promise<Result<GenerateSpedFiscalOutput, string>>;
}
