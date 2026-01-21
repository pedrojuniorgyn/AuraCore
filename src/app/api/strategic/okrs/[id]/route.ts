import { NextRequest, NextResponse } from 'next/server';

// Import shared store from main route (in real app, this would be a database)
// For this mock, we'll use a simple in-memory store
const okrsStore = new Map<string, Record<string, unknown>>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Fetch from main store or return mock data
  const response = await fetch(
    new URL('/api/strategic/okrs', request.url).toString()
  );
  const { okrs } = await response.json();
  const okr = okrs.find((o: Record<string, unknown>) => o.id === id);

  if (!okr) {
    return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
  }

  return NextResponse.json(okr);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    // Get existing OKR
    const response = await fetch(
      new URL('/api/strategic/okrs', request.url).toString()
    );
    const { okrs } = await response.json();
    const existingOKR = okrs.find((o: Record<string, unknown>) => o.id === id);

    if (!existingOKR) {
      return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
    }

    // Update OKR
    const updatedOKR = {
      ...existingOKR,
      ...body,
      updatedAt: new Date(),
    };

    // In real implementation, save to database
    okrsStore.set(id, updatedOKR);

    return NextResponse.json(updatedOKR);
  } catch (error) {
    console.error('Error updating OKR:', error);
    return NextResponse.json({ error: 'Failed to update OKR' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // In real implementation, delete from database
  okrsStore.delete(id);

  return NextResponse.json({ success: true });
}
