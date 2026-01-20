/**
 * Health check do serviço de agentes.
 */

import { NextRequest, NextResponse } from 'next/server';

const AGENTS_API_URL = process.env.AGENTS_API_URL || 'http://agents:8080';

export async function GET(request: NextRequest) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${AGENTS_API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: 'Serviço de agentes não disponível',
        },
        { status: 503 }
      );
    }

    const health = await response.json();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Não foi possível conectar ao serviço de agentes',
      },
      { status: 503 }
    );
  }
}
