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
    logger.info('Fetching integration:', id);

    return NextResponse.json({
      id,
      type: 'slack',
      name: 'Slack',
      config: {
        webhookUrl: 'https://hooks.slack.com/services/...',
        channel: '#estrategia',
        events: ['kpi.critical'],
      },
      isActive: true,
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error fetching integration:', error);
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
    const config = await request.json();

    // TODO: Update in database
    logger.info('Updating integration:', id, config);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error updating integration:', error);
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
    logger.info('Deleting integration:', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error deleting integration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
