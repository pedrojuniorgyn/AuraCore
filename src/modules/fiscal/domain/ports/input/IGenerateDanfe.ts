/**
 * Input Port: Geração de DANFE (Documento Auxiliar de NFe)
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface GenerateDanfeInput {
  /** ID do documento fiscal */
  documentId: string;
  /** Formato: PDF ou HTML */
  format?: 'PDF' | 'HTML';
  /** Incluir QR Code */
  includeQrCode?: boolean;
}

export interface GenerateDanfeOutput {
  documentId: string;
  format: 'PDF' | 'HTML';
  content: Buffer | string;
  filename: string;
  generatedAt: Date;
}

export interface IGenerateDanfe {
  execute(
    input: GenerateDanfeInput,
    context: ExecutionContext
  ): Promise<Result<GenerateDanfeOutput, string>>;
}
