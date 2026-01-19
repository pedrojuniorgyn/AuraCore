/**
 * API Route: Agent Session by ID
 *
 * GET /api/agent/sessions/[sessionId] - Get session with messages
 * PATCH /api/agent/sessions/[sessionId] - Update session title
 * DELETE /api/agent/sessions/[sessionId] - Delete session
 *
 * @see E-Agent-Fase6
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { sessionStore } from '@/agent/persistence';
import { Result } from '@/shared/domain';
import { z } from 'zod';

const UpdateSessionSchema = z.object({
  title: z.string().min(1).max(255),
});

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET - Get session with messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const branchId = resolveBranchIdOrThrow(request.headers, ctx);
    const { sessionId } = await params;

    const sessionResult = await sessionStore.getSession(
      sessionId,
      ctx.organizationId,
      branchId
    );

    if (Result.isFail(sessionResult)) {
      return NextResponse.json({ error: sessionResult.error }, { status: 500 });
    }

    if (!sessionResult.value) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // getMessages agora requer organizationId e branchId para segurança multi-tenancy
    const messagesResult = await sessionStore.getMessages(
      sessionId,
      ctx.organizationId,
      branchId
    );

    if (Result.isFail(messagesResult)) {
      return NextResponse.json(
        { error: messagesResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session: sessionResult.value,
      messages: messagesResult.value,
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update session title
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const branchId = resolveBranchIdOrThrow(request.headers, ctx);
    const { sessionId } = await params;

    // Verificar se sessão existe e pertence ao usuário
    const sessionResult = await sessionStore.getSession(
      sessionId,
      ctx.organizationId,
      branchId
    );

    if (Result.isFail(sessionResult)) {
      return NextResponse.json({ error: sessionResult.error }, { status: 500 });
    }

    if (!sessionResult.value) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = UpdateSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await sessionStore.updateSessionTitle(
      sessionId,
      parsed.data.title
    );

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete session
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const branchId = resolveBranchIdOrThrow(request.headers, ctx);
    const { sessionId } = await params;

    const result = await sessionStore.deleteSession(
      sessionId,
      ctx.organizationId,
      branchId
    );

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
