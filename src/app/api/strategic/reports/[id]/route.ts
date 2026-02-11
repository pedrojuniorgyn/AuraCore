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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // TODO: Fetch from database
    // For now, return mock data
    return NextResponse.json({
      id,
      name: 'Relatório Executivo',
      type: 'executive',
      // ... other fields
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error fetching report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const PUT = withDI(async (request: Request, context: RouteContext) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    
    // FIX Bug 6: Validar que ID não é undefined
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const config = await request.json();

    // TODO: Update in database
    logger.info('Updating report:', id, config);

    // FIX Bug 6: SEMPRE retornar o ID no response
    return NextResponse.json({ 
      success: true, 
      id, // Garantir que ID está presente
      message: 'Relatório atualizado com sucesso' 
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error updating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withDI(async (request: Request, context: RouteContext) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // TODO: Delete from database
    logger.info('Deleting report:', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error deleting report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
