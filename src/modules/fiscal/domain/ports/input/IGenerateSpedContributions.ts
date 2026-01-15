/**
 * Input Port: Geração de SPED Contribuições (EFD-PIS/COFINS)
 *
 * Define contrato para geração do arquivo SPED Contribuições
 * conforme layout definido pela Receita Federal.
 */

import { Result } from '@/shared/domain';
import type { ExecutionContext } from './IGenerateSpedFiscal';

export interface GenerateSpedContributionsInput {
  /** Período no formato MMAAAA (ex: 012026) */
  competencia: string;
  /** Finalidade: ORIGINAL, RETIFICADORA */
  finalidade: 'ORIGINAL' | 'RETIFICADORA';
  /** Hash do arquivo retificado */
  hashRetificado?: string;
}

export interface GenerateSpedContributionsOutput {
  content: string;
  filename: string;
  hash: string;
  totalRegistros: number;
  geradoEm: Date;
}

export interface IGenerateSpedContributions {
  execute(
    input: GenerateSpedContributionsInput,
    context: ExecutionContext
  ): Promise<Result<GenerateSpedContributionsOutput, string>>;
}
