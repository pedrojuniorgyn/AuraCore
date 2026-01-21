import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; krId: string }> }
) {
  const { id: okrId, krId } = await params;

  // Get OKR and find specific key result
  const response = await fetch(
    new URL(`/api/strategic/okrs/${okrId}`, request.url).toString()
  );

  if (!response.ok) {
    return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
  }

  const okr = await response.json();
  const keyResult = okr.keyResults?.find(
    (kr: Record<string, unknown>) => kr.id === krId
  );

  if (!keyResult) {
    return NextResponse.json({ error: 'Key Result not found' }, { status: 404 });
  }

  return NextResponse.json(keyResult);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; krId: string }> }
) {
  const { id: okrId, krId } = await params;

  try {
    const body = await request.json();

    // Get existing OKR
    const response = await fetch(
      new URL(`/api/strategic/okrs/${okrId}`, request.url).toString()
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'OKR not found' }, { status: 404 });
    }

    const okr = await response.json();
    const krIndex = okr.keyResults?.findIndex(
      (kr: Record<string, unknown>) => kr.id === krId
    );

    if (krIndex === -1 || krIndex === undefined) {
      return NextResponse.json({ error: 'Key Result not found' }, { status: 404 });
    }

    // Update key result
    const updatedKR = {
      ...okr.keyResults[krIndex],
      ...body,
      updatedAt: new Date(),
    };

    // In real implementation, update in database
    return NextResponse.json(updatedKR);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Error updating Key Result:', error);
    return NextResponse.json({ error: 'Failed to update Key Result' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; krId: string }> }
) {
  const { krId } = await params;

  // In real implementation, delete from database
  console.log('Deleting Key Result:', krId);

  return NextResponse.json({ success: true });
}
