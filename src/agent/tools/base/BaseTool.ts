/**
 * @description Classe base para ferramentas do Agente AuraCore
 * 
 * Segue o padrão LangChain para Tools, mas adaptado para o contexto AuraCore.
 * Cada tool tem:
 * - name: identificador único
 * - description: descrição para o LLM
 * - schema: schema Zod para validação de input
 * - _call: implementação da ferramenta
 */

import { z } from 'zod';
import type { AgentExecutionContext } from '../../core/AgentContext';
import { Result } from '@/shared/domain';

/**
 * Interface para resultado de tool
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Configuração base de tool
 */
export interface ToolConfig {
  /** Nome único da ferramenta */
  name: string;
  /** Descrição para o LLM (quando usar, o que faz) */
  description: string;
  /** Categoria da ferramenta */
  category: 'fiscal' | 'financial' | 'tms' | 'wms' | 'workspace' | 'general';
  /** Se requer autenticação Google Workspace */
  requiresWorkspace?: boolean;
  /** Se é uma operação destrutiva (requer confirmação) */
  isDestructive?: boolean;
}

/**
 * Classe base abstrata para tools
 * 
 * @example
 * ```typescript
 * export class ImportNFeTool extends BaseTool<ImportNFeInput, ImportNFeOutput> {
 *   name = 'import_nfe';
 *   description = 'Importa NFe de email, Drive ou upload';
 *   category = 'fiscal' as const;
 *   
 *   schema = z.object({
 *     source: z.enum(['email', 'drive', 'upload']),
 *     identifier: z.string(),
 *   });
 *   
 *   async execute(input: ImportNFeInput, context: AgentExecutionContext) {
 *     // implementação
 *   }
 * }
 * ```
 */
export abstract class BaseTool<TInput = unknown, TOutput = unknown> {
  /** Nome único da ferramenta */
  abstract readonly name: string;
  
  /** Descrição para o LLM */
  abstract readonly description: string;
  
  /** Categoria */
  abstract readonly category: ToolConfig['category'];
  
  /** Schema Zod para validação de input */
  abstract readonly schema: z.ZodType<TInput>;
  
  /** Se requer workspace (default: false) */
  readonly requiresWorkspace: boolean = false;
  
  /** Se é destrutivo (default: false) */
  readonly isDestructive: boolean = false;

  /**
   * Executa a ferramenta
   * 
   * @param input - Input validado pelo schema
   * @param context - Contexto de execução (userId, orgId, branchId)
   */
  abstract execute(
    input: TInput,
    context: AgentExecutionContext
  ): Promise<Result<TOutput, string>>;

  /**
   * Valida e executa a ferramenta
   * Método principal chamado pelo agente
   */
  async call(
    rawInput: unknown,
    context: AgentExecutionContext
  ): Promise<ToolResult<TOutput>> {
    // Validar input
    const parseResult = this.schema.safeParse(rawInput);
    
    if (!parseResult.success) {
      return {
        success: false,
        error: `Input inválido: ${parseResult.error.message}`,
      };
    }

    // Executar
    const result = await this.execute(parseResult.data, context);

    if (result.isFailure) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: result.value,
    };
  }

  /**
   * Retorna representação JSON da tool para LLM
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      category: this.category,
      requiresWorkspace: this.requiresWorkspace,
      isDestructive: this.isDestructive,
      parameters: this.getSchemaDescription(),
    };
  }

  /**
   * Retorna descrição do schema para o LLM
   * Nota: Simplificado para compatibilidade com Zod 4
   */
  private getSchemaDescription(): Record<string, unknown> {
    // Em Zod 4, a estrutura interna mudou
    // Para MVP, retornamos descrição básica
    // TODO: Implementar conversão completa para JSON Schema quando LangGraph for integrado
    return {
      type: 'object',
      description: this.description,
    };
  }
}
