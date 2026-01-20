import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // TODO: Toggle integration status in database
    console.log('Toggling integration status:', id);

    return NextResponse.json({ 
      success: true, 
      id,
      isActive: true, // This would come from database
    });
  } catch (error) {
    console.error('Error toggling integration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
