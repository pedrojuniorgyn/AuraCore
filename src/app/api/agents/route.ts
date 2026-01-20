/**
 * Lista agentes disponíveis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';

const AGENTS_API_URL = process.env.AGENTS_API_URL || 'http://agents:8080';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    await getTenantContext();
    
    const response = await fetch(`${AGENTS_API_URL}/agents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Cache por 5 minutos
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erro ao listar agentes' },
        { status: response.status }
      );
    }

    const agents = await response.json();
    return NextResponse.json(agents);
  } catch (error) {
    // Verificar se é erro de autenticação (NextResponse lançado)
    if (error instanceof NextResponse) {
      return error;
    }
    
    console.error('[Agents Gateway] Error listing agents:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
