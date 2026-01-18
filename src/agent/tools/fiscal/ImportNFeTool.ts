/**
 * @description Tool para importar NFe de diferentes fontes
 * 
 * Importa Nota Fiscal Eletrônica de:
 * - Email (Gmail)
 * - Google Drive
 * - Upload direto (base64)
 */

import { z } from 'zod';
import { BaseTool } from '../base/BaseTool';
import type { AgentExecutionContext } from '../../core/AgentContext';
import { Result } from '@/shared/domain';

/**
 * Schema de input
 */
const ImportNFeInputSchema = z.object({
  source: z.enum(['email', 'drive', 'upload']).describe('Origem do documento'),
  identifier: z.string().describe('ID da mensagem, ID do arquivo, ou base64 do conteúdo'),
  validateOnly: z.boolean().optional().describe('Apenas validar sem importar'),
});

type ImportNFeInput = z.infer<typeof ImportNFeInputSchema>;

/**
 * Dados da NFe importada
 */
interface ImportNFeOutput {
  success: boolean;
  nfeId?: string;
  summary?: string;
  errors?: string[];
  data?: {
    chaveAcesso: string;
    numero: string;
    serie: string;
    emitente: string;
    valor: number;
  };
}

/**
 * Tool para importar NFe
 * 
 * @example
 * ```
 * Usuário: "Importar a NFe do email do fornecedor XYZ de hoje"
 * Agente usa: ImportNFeTool({ source: 'email', identifier: 'msg-id-123' })
 * ```
 */
export class ImportNFeTool extends BaseTool<ImportNFeInput, ImportNFeOutput> {
  readonly name = 'import_nfe';
  readonly description = `Importa NFe (Nota Fiscal Eletrônica) de email, Google Drive ou upload direto.
Use quando o usuário quiser:
- Importar NFe de um email recebido
- Importar NFe de um arquivo no Drive
- Processar XML de NFe

Parâmetros:
- source: 'email' (buscar no Gmail), 'drive' (buscar no Drive), 'upload' (base64)
- identifier: ID do email/arquivo ou conteúdo em base64
- validateOnly: true para apenas validar sem inserir no sistema`;
  
  readonly category = 'fiscal' as const;
  readonly requiresWorkspace = true;
  readonly schema = ImportNFeInputSchema;

  async execute(
    input: ImportNFeInput,
    context: AgentExecutionContext
  ): Promise<Result<ImportNFeOutput, string>> {
    // TODO: Implementar integração real com o módulo fiscal
    // Por enquanto retorna mock para validar estrutura
    
    const { source, identifier, validateOnly } = input;

    // Simular processamento
    const mockData = {
      chaveAcesso: '35260112345678000195550010000001231234567890',
      numero: '123',
      serie: '1',
      emitente: 'Empresa Fornecedora LTDA',
      valor: 1500.00,
    };

    if (validateOnly) {
      return Result.ok({
        success: true,
        summary: `NFe ${mockData.numero} validada com sucesso`,
        data: mockData,
      });
    }

    // Simular importação
    return Result.ok({
      success: true,
      nfeId: globalThis.crypto.randomUUID(),
      summary: `NFe ${mockData.numero} importada de ${source} (${identifier.substring(0, 20)}...)`,
      data: mockData,
    });
  }
}
