/**
 * Input Port: Geração de SPED ECD (Escrituração Contábil Digital)
 *
 * Define contrato para geração do arquivo SPED ECD
 * conforme layout definido pela Receita Federal.
 */

import { Result } from '@/shared/domain';
import type { ExecutionContext } from './IGenerateSpedFiscal';

export interface GenerateSpedEcdInput {
  /** Ano de exercício (ex: 2026) */
  anoExercicio: number;
  /** Finalidade: ORIGINAL, RETIFICADORA, SUBSTITUTA */
  finalidade: 'ORIGINAL' | 'RETIFICADORA' | 'SUBSTITUTA';
  /** Hash do arquivo retificado */
  hashRetificado?: string;
}

export interface GenerateSpedEcdOutput {
  content: string;
  filename: string;
  hash: string;
  totalRegistros: number;
  geradoEm: Date;
}

export interface IGenerateSpedEcd {
  execute(
    input: GenerateSpedEcdInput,
    context: ExecutionContext
  ): Promise<Result<GenerateSpedEcdOutput, string>>;
}
