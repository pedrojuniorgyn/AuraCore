import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { logger } from '@/shared/infrastructure/logging';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const POST = withDI(async (request: Request, context: RouteContext) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // TODO: Toggle integration status in database
    logger.info('Toggling integration status:', id);

    return NextResponse.json({ 
      success: true, 
      id,
      isActive: true, // This would come from database
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error toggling integration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
