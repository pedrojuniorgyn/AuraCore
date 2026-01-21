/**
 * API Route: Gerenciamento de Sessões de Voz
 * 
 * POST /api/agent/voice/session - Criar sessão
 * DELETE /api/agent/voice/session?sessionId=xxx - Encerrar sessão
 * GET /api/agent/voice/session?sessionId=xxx - Obter detalhes da sessão
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { VoiceHandler } from '@/agent/voice/VoiceHandler';
import { agentLogger } from '@/agent/observability';

// Singleton do VoiceHandler para manter sessões entre requisições
const voiceHandler = new VoiceHandler();

/**
 * POST - Criar nova sessão de voz
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    // 2. Criar sessão
    const session = voiceHandler.createSession(
      ctx.userId,
      ctx.organizationId,
      branchId
    );

    agentLogger.info('voice', 'API.session.create', {
      sessionId: session.id,
      userId: ctx.userId,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      startedAt: session.startedAt.toISOString(),
      status: session.status,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);

    agentLogger.error('voice', 'API.session.create.error', {
      error: errorMessage,
    });

    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * GET - Obter detalhes da sessão
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Autenticação
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Obter sessionId
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      // Retornar lista de sessões ativas do usuário
      const activeSessions = voiceHandler.getActiveSessions()
        .filter(s => s.userId === ctx.userId)
        .map(s => ({
          sessionId: s.id,
          status: s.status,
          messageCount: s.messages.length,
          startedAt: s.startedAt.toISOString(),
          lastActivityAt: s.lastActivityAt.toISOString(),
        }));

      return NextResponse.json({
        success: true,
        sessions: activeSessions,
      });
    }

    // 3. Obter sessão específica
    const session = voiceHandler.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verificar se a sessão pertence ao usuário
    if (session.userId !== ctx.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        isActive: session.isActive,
        messageCount: session.messages.length,
        messages: session.messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        })),
        startedAt: session.startedAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString(),
        endedAt: session.endedAt?.toISOString(),
      },
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);

    agentLogger.error('voice', 'API.session.get.error', {
      error: errorMessage,
    });

    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Encerrar sessão
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Autenticação
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Obter sessionId
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // 3. Verificar sessão
    const session = voiceHandler.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verificar se a sessão pertence ao usuário
    if (session.userId !== ctx.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // 4. Encerrar sessão
    voiceHandler.endSession(sessionId);

    agentLogger.info('voice', 'API.session.end', {
      sessionId,
      userId: ctx.userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Session ended',
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);

    agentLogger.error('voice', 'API.session.delete.error', {
      error: errorMessage,
    });

    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    );
  }
}
