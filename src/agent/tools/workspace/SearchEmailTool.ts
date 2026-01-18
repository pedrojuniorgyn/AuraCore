/**
 * @description Tool para buscar emails no Gmail
 */

import { z } from 'zod';
import { BaseTool } from '../base/BaseTool';
import type { AgentExecutionContext } from '../../core/AgentContext';
import { Result } from '@/shared/domain';

/**
 * Schema de input
 */
const SearchEmailInputSchema = z.object({
  query: z.string().describe('Query do Gmail (ex: "from:fornecedor@email.com has:attachment")'),
  maxResults: z.number().min(1).max(50).optional().describe('Número máximo de resultados (default: 10)'),
  includeBody: z.boolean().optional().describe('Incluir corpo do email'),
  includeAttachments: z.boolean().optional().describe('Incluir informações de anexos'),
});

type SearchEmailInput = z.infer<typeof SearchEmailInputSchema>;

/**
 * Email encontrado
 */
interface EmailResult {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body?: string;
  attachments?: Array<{ name: string; mimeType: string; size: number }>;
}

/**
 * Resultado da busca
 */
interface SearchEmailOutput {
  success: boolean;
  count: number;
  emails: EmailResult[];
}

/**
 * Tool para buscar emails
 */
export class SearchEmailTool extends BaseTool<SearchEmailInput, SearchEmailOutput> {
  readonly name = 'search_email';
  readonly description = `Busca emails no Gmail do usuário.
Use quando o usuário quiser:
- Encontrar emails de um remetente específico
- Buscar emails com anexos (NFe, CTe, relatórios)
- Verificar emails recentes sobre um assunto

Exemplos de query:
- "from:fornecedor@empresa.com" - emails de um remetente
- "has:attachment filename:xml" - emails com anexos XML
- "after:2026/01/01 subject:NFe" - emails recentes sobre NFe
- "is:unread from:banco" - emails não lidos do banco`;
  
  readonly category = 'workspace' as const;
  readonly requiresWorkspace = true;
  readonly schema = SearchEmailInputSchema;

  async execute(
    input: SearchEmailInput,
    context: AgentExecutionContext
  ): Promise<Result<SearchEmailOutput, string>> {
    // TODO: Implementar integração real com GoogleWorkspaceClient
    // Por enquanto retorna mock
    
    const mockEmails: EmailResult[] = [
      {
        id: 'msg-001',
        from: 'nfe@fornecedor.com.br',
        subject: 'NFe 000123 - Materiais de Escritório',
        date: new Date().toISOString(),
        snippet: 'Segue anexo a NFe referente ao pedido 456...',
        attachments: input.includeAttachments ? [
          { name: 'nfe_123.xml', mimeType: 'text/xml', size: 15000 },
          { name: 'danfe_123.pdf', mimeType: 'application/pdf', size: 150000 },
        ] : undefined,
      },
    ];

    return Result.ok({
      success: true,
      count: mockEmails.length,
      emails: mockEmails,
    });
  }
}
