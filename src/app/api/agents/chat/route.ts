/**
 * Gateway para o serviço de agentes Agno.
 *
 * Faz proxy das requisições para o servidor Python,
 * adicionando contexto de autenticação e organização.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';

const AGENTS_API_URL = process.env.AGENTS_API_URL || 'http://agents:8080';

export async function POST(request: NextRequest) {
  try {
    // Obter contexto do usuário
    const context = await getTenantContext();

    // Parse do body
    const body = await request.json();

    // Validar mensagem
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      );
    }

    // Adicionar contexto do usuário
    const enrichedBody = {
      ...body,
      user_id: context.userId,
      org_id: context.organizationId,
      branch_id: context.branchId,
      role: context.role || 'user',
    };

    // Fazer request para o serviço de agentes
    const response = await fetch(`${AGENTS_API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrichedBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Agents Gateway] Error from agents service:', error);
      return NextResponse.json(
        { error: `Erro no serviço de agentes: ${response.status}` },
        { status: response.status }
      );
    }

    // Verificar se é streaming
    if (body.stream) {
      const stream = response.body;
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // Verificar se é erro de autenticação (NextResponse lançado)
    if (error instanceof NextResponse) {
      return error;
    }
    
    console.error('[Agents Gateway] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno no gateway de agentes' },
      { status: 500 }
    );
  }
}
