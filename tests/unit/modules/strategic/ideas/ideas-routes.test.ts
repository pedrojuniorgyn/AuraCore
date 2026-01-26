import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST as approveIdea } from '@/app/api/strategic/ideas/[id]/approve/route';
import { PUT as updateIdea } from '@/app/api/strategic/ideas/[id]/route';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/auth/context';

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: vi.fn(),
      update: vi.fn(),
    },
  };
});

vi.mock('@/lib/auth/context', () => ({
  getTenantContext: vi.fn(),
}));

type DbMock = typeof db & {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

const mockDb = db as unknown as DbMock;
const mockGetTenantContext = getTenantContext as unknown as ReturnType<typeof vi.fn>;

const tenant = {
  userId: 'user-1',
  organizationId: 1,
  branchId: 2,
  role: 'USER',
  defaultBranchId: 2,
  allowedBranches: [2],
  isAdmin: false,
};

const validId = '123e4567-e89b-12d3-a456-426614174000';

const mockUpdate = (rows: number) => {
  const where = vi.fn().mockResolvedValue({ rowsAffected: [rows] });
  const set = vi.fn().mockReturnValue({ where });
  mockDb.update.mockReturnValue({ set });
  return { where, set };
};

const mockSelectOnce = (result: unknown[]) => {
  mockDb.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  });
};

const makeRequest = (jsonImpl: () => Promise<unknown> | unknown) =>
  ({ json: jsonImpl } as unknown as NextRequest);

describe('approve idea route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when tenant context is missing', async () => {
    mockGetTenantContext.mockResolvedValue(null);

    const response = await approveIdea({} as NextRequest, { params: Promise.resolve({ id: validId }) });

    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid uuid', async () => {
    mockGetTenantContext.mockResolvedValue(tenant);

    const response = await approveIdea({} as NextRequest, { params: Promise.resolve({ id: 'invalid' }) });

    expect(response.status).toBe(400);
  });

  it('returns 404 when idea does not exist in tenant', async () => {
    mockGetTenantContext.mockResolvedValue(tenant);
    mockUpdate(0);
    mockSelectOnce([]);

    const response = await approveIdea({} as NextRequest, { params: Promise.resolve({ id: validId }) });

    expect(response.status).toBe(404);
  });

  it('returns 400 when status is not allowed', async () => {
    mockGetTenantContext.mockResolvedValue(tenant);
    mockUpdate(0);
    mockSelectOnce([{ status: 'APPROVED' }]);

    const response = await approveIdea({} as NextRequest, { params: Promise.resolve({ id: validId }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/pendentes|revis/);
  });

  it('returns 200 on successful approve', async () => {
    mockGetTenantContext.mockResolvedValue(tenant);
    mockUpdate(1);

    const response = await approveIdea({} as NextRequest, { params: Promise.resolve({ id: validId }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });
});

describe('update idea route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validBody = {
    title: 'New title',
    description: 'Desc',
    importance: 'HIGH',
    urgency: 'CRITICAL',
    estimatedImpact: 'Large',
  };

  it('returns 400 for invalid JSON body', async () => {
    mockGetTenantContext.mockResolvedValue(tenant);
    const response = await updateIdea(
      makeRequest(vi.fn().mockRejectedValue(new Error('bad json'))),
      { params: Promise.resolve({ id: validId }) }
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for schema validation error', async () => {
    mockGetTenantContext.mockResolvedValue(tenant);
    const response = await updateIdea(
      makeRequest(vi.fn().mockResolvedValue({ title: '' })),
      { params: Promise.resolve({ id: validId }) }
    );
    expect(response.status).toBe(400);
  });

  it('returns 404 when update affects no rows', async () => {
    mockGetTenantContext.mockResolvedValue(tenant);
    mockUpdate(0);

    const response = await updateIdea(makeRequest(vi.fn().mockResolvedValue(validBody)), {
      params: Promise.resolve({ id: validId }),
    });

    expect(response.status).toBe(404);
  });

  it('returns 400 when no updatable fields are provided', async () => {
    mockGetTenantContext.mockResolvedValue(tenant);

    const response = await updateIdea(makeRequest(vi.fn().mockResolvedValue({})), {
      params: Promise.resolve({ id: validId }),
    });

    expect(response.status).toBe(400);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('returns 200 when update succeeds', async () => {
    mockGetTenantContext.mockResolvedValue(tenant);
    mockUpdate(1);
    mockSelectOnce([{ id: validId, ...validBody }]);

    const response = await updateIdea(makeRequest(vi.fn().mockResolvedValue(validBody)), {
      params: Promise.resolve({ id: validId }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.id).toBe(validId);
    expect(json.title).toBe(validBody.title);
  });
});
