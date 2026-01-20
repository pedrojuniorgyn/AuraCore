import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// In-memory storage for development (replace with database in production)
const userLayouts = new Map<string, unknown[]>();

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || 'default';
    const layout = userLayouts.get(userId) || [];

    // TODO: Fetch user's saved layout from database
    // const layout = await db.query.dashboardLayouts.findFirst({
    //   where: eq(dashboardLayouts.userId, userId)
    // });

    return NextResponse.json({
      layout,
    });
  } catch (error) {
    console.error('Error fetching dashboard layout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { layout } = await request.json();
    
    if (!Array.isArray(layout)) {
      return NextResponse.json({ error: 'Invalid layout format' }, { status: 400 });
    }

    const userId = session.user.id || 'default';
    
    // Store in memory for development
    userLayouts.set(userId, layout);

    // TODO: Save layout to database for user
    // await db.insert(dashboardLayouts)
    //   .values({ userId, layout: JSON.stringify(layout), updatedAt: new Date() })
    //   .onConflictDoUpdate({ 
    //     target: dashboardLayouts.userId,
    //     set: { layout: JSON.stringify(layout), updatedAt: new Date() }
    //   });

    console.log('Dashboard layout saved for user:', userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving dashboard layout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
