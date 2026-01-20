import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // TODO: Fetch from database
    console.log('Fetching integration:', id);

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
    console.error('Error fetching integration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const config = await request.json();

    // TODO: Update in database
    console.log('Updating integration:', id, config);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error updating integration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // TODO: Delete from database
    console.log('Deleting integration:', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting integration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
