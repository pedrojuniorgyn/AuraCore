/**
 * API: GET/PUT/DELETE /api/strategic/templates/[id]
 * Operações em template específico
 * 
 * @module app/api/strategic/templates/[id]
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { logger } from '@/shared/infrastructure/logging';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = withDI(async (request: Request, context: RouteContext) => {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // TODO: Buscar template do banco
    // const template = await templateRepository.findById(id);

    logger.info('Getting template:', id);

    return NextResponse.json({
      template: null, // TODO: retornar template real
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/templates/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PUT = withDI(async (request: Request, context: RouteContext) => {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const updates = await request.json();

    // TODO: Atualizar template no banco
    // await templateRepository.update(id, updates);

    logger.info('Updating template:', id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('PUT /api/strategic/templates/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const DELETE = withDI(async (request: Request, context: RouteContext) => {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // TODO: Deletar template do banco
    // await templateRepository.delete(id);

    logger.info('Deleting template:', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('DELETE /api/strategic/templates/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
