/**
 * 🤖 POST /api/agent/chat
 * 
 * API Route para chat com o Agente AuraCore
 * 
 * Recebe mensagens do usuário e retorna respostas do agente.
 * Suporta execução de tools (fiscal, financial, workspace).
 * 
 * Headers:
 * - Authorization: Bearer token (via next-auth session)
 * - x-branch-id: ID da filial (opcional, usa default se não informado)
 * 
 * Body:
 * {
 *   "message": "string",
 *   "sessionId": "string" (opcional - para continuar conversa)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "response": "string",
 *   "sessionId": "string",
 *   "metadata": { tokensUsed, processingTimeMs, toolsExecuted }
 * }
 * 
 * @see docs/agent/README.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { AuraAgent } from '@/agent';
import { z } from 'zod';

/**
 * Schema de validação do request
 */
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000).describe('Mensagem do usuário'),
  sessionId: z.string().uuid().optional().describe('ID da sessão para continuar conversa'),
});

/**
 * Cache de agentes por sessionId (em memória para MVP)
 * TODO: Implementar persistência de sessões em banco de dados
 */
const agentCache = new Map<string, AuraAgent>();

/**
 * POST /api/agent/chat
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Contexto multi-tenant (OBRIGATÓRIO)
    const ctx = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    // 2. Validar body
    const body = await request.json();
    const parseResult = ChatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Requisição inválida',
          details: String(parseResult.error),
        },
        { status: 400 }
      );
    }

    const { message, sessionId } = parseResult.data;

    // 3. Obter ou criar agente
    let agent: AuraAgent;
    let currentSessionId = sessionId;

    if (sessionId && agentCache.has(sessionId)) {
      // Reutilizar agente existente
      agent = agentCache.get(sessionId)!;
    } else {
      // Criar novo agente
      agent = await AuraAgent.create({
        userId: ctx.userId,
        userName: 'Usuário', // TODO: Obter do perfil
        userEmail: '', // TODO: Obter do perfil
        userRoles: [ctx.role],
        organizationId: ctx.organizationId,
        branchId,
        organizationName: 'Organização', // TODO: Obter do banco
        branchName: 'Filial', // TODO: Obter do banco
        // googleAccessToken: obtido via OAuth separado
      });

      currentSessionId = agent.sessionId;
      
      // Cache do agente (com limite de 100 sessões)
      if (agentCache.size >= 100) {
        // Remover sessão mais antiga
        const firstKey = agentCache.keys().next().value;
        if (firstKey) agentCache.delete(firstKey);
      }
      agentCache.set(currentSessionId, agent);
    }

    // 4. Processar mensagem
    const response = await agent.chat(message);

    if (response.isFailure) {
      return NextResponse.json(
        {
          success: false,
          error: response.error,
          sessionId: currentSessionId,
        },
        { status: 500 }
      );
    }

    const processingTimeMs = Date.now() - startTime;

    // 5. Retornar resposta
    return NextResponse.json({
      success: true,
      response: response.value.text,
      sessionId: currentSessionId,
      messageId: response.value.messageId,
      metadata: {
        tokensUsed: response.value.metadata.tokensUsed,
        processingTimeMs,
        toolsExecuted: response.value.metadata.toolsExecuted || [],
      },
    });
  } catch (error: unknown) {
    const processingTimeMs = Date.now() - startTime;

    // Tratar erros de autenticação (thrown por getTenantContext)
    if (error instanceof Response) {
      return error;
    }

    if (error instanceof NextResponse) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro no chat do agente:', error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        metadata: { processingTimeMs },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent/chat - Informações sobre o endpoint
 */
export async function GET() {
  return NextResponse.json({
    name: 'AuraCore Agent Chat API',
    version: '1.0.0',
    description: 'API para interação com o Agente AuraCore',
    endpoints: {
      'POST /api/agent/chat': {
        description: 'Enviar mensagem para o agente',
        body: {
          message: 'string (obrigatório)',
          sessionId: 'string UUID (opcional)',
        },
        headers: {
          'x-branch-id': 'number (opcional)',
        },
      },
    },
    tools: [
      'import_nfe - Importar NFe de email/Drive',
      'calculate_tax - Calcular impostos de operação',
      'consult_sped - Consultar registros SPED',
      'search_email - Buscar emails no Gmail',
    ],
  });
}
