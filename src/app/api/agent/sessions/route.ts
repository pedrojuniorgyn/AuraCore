/**
 * API Route: Agent Sessions
 *
 * GET /api/agent/sessions - List user sessions
 * POST /api/agent/sessions - Create new session
 *
 * @see E-Agent-Fase6
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { resolveBranchIdOrThrow } from '@/lib/auth/branch';
import { sessionStore } from '@/agent/persistence';
import { Result } from '@/shared/domain';
import { z } from 'zod';

const CreateSessionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const ListQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  pageSize: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});

/**
 * GET - List user sessions
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    const { searchParams } = new URL(request.url);
    const query = ListQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!query.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: query.error.issues },
        { status: 400 }
      );
    }

    const result = await sessionStore.listSessions({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId,
      page: query.data.page,
      pageSize: query.data.pageSize,
    });

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.value);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Error listing sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new session
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    const body = await request.json();
    const parsed = CreateSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await sessionStore.createSession({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId,
      title: parsed.data.title,
      metadata: parsed.data.metadata,
    });

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.value, { status: 201 });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
