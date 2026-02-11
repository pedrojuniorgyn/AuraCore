import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
const { insertValues, selectChain, updateChain } = vi.hoisted(() => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    fetch: vi.fn().mockResolvedValue([]),
    leftJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    leftJoinMany: vi.fn().mockReturnThis(),
  };
  const updChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  const valuesFn = vi.fn();
  return {
    insertValues: valuesFn,
    selectChain: chain,
    updateChain: updChain,
  };
});

import { POST as checkpointPost } from '@/app/api/tms/trips/[id]/checkpoint/route';
import { POST as tripsPost } from '@/app/api/tms/trips/route';
import { PUT as tripPut } from '@/app/api/tms/trips/[id]/route';
import { POST as ssrmPost } from '@/app/api/tms/trips/ssrm/route';
import { getTenantContext, hasAccessToBranch, getBranchScopeFilter } from '@/lib/auth/context';
import { db, ensureConnection } from '@/lib/db';
import { insertReturning, queryFirst } from '@/lib/db/query-helpers';

vi.mock('@/lib/auth/context', () => ({
  getTenantContext: vi.fn(),
  hasAccessToBranch: vi.fn(),
  getBranchScopeFilter: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  ensureConnection: vi.fn(),
  db: {
    insert: vi.fn().mockReturnValue({ values: insertValues }),
    select: vi.fn().mockReturnValue(selectChain),
    update: vi.fn().mockReturnValue(updateChain),
  },
}));

vi.mock('@/lib/db/query-helpers', () => ({
  queryFirst: vi.fn(),
  insertReturning: vi.fn(),
}));

const mockGetTenantContext = getTenantContext as unknown as ReturnType<typeof vi.fn>;
const mockHasAccessToBranch = hasAccessToBranch as unknown as ReturnType<typeof vi.fn>;
const mockGetBranchScopeFilter = getBranchScopeFilter as unknown as ReturnType<typeof vi.fn>;
const mockEnsureConnection = ensureConnection as unknown as ReturnType<typeof vi.fn>;
const mockInsertReturning = insertReturning as unknown as ReturnType<typeof vi.fn>;
const mockQueryFirst = queryFirst as unknown as ReturnType<typeof vi.fn>;
const mockDbInsert = db.insert as unknown as ReturnType<typeof vi.fn>;
const mockDbSelect = db.select as unknown as ReturnType<typeof vi.fn>;

describe('tms/trips routes hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertValues.mockResolvedValue(undefined);
    selectChain.from.mockReturnThis();
    selectChain.where.mockReturnThis();
    selectChain.orderBy.mockReturnThis();
    selectChain.offset.mockReturnThis();
    selectChain.fetch.mockResolvedValue([]);
    selectChain.leftJoin.mockReturnThis();
    selectChain.select.mockReturnThis();
    selectChain.leftJoinMany.mockReturnThis();
    updateChain.set.mockReturnThis();
    updateChain.where.mockResolvedValue(undefined);
    mockEnsureConnection.mockResolvedValue(undefined);
    mockDbInsert.mockReturnValue({ values: insertValues });
    mockDbSelect.mockReturnValue(selectChain);
    mockInsertReturning.mockResolvedValue([{ id: 1 }]);
    mockQueryFirst.mockResolvedValue({ id: 1 });
    mockHasAccessToBranch.mockReturnValue(true);
    mockGetBranchScopeFilter.mockReturnValue([]);
  });

  it('returns 400 for invalid JSON', async () => {
    mockGetTenantContext.mockResolvedValue({ organizationId: 1, branchId: 2, userId: 'user-1' });
    mockQueryFirst.mockResolvedValue({ id: 1 });

    const response = await checkpointPost(
      new Request('https://app.test/api/tms/trips/1/checkpoint', { method: 'POST', body: 'not-json' }) as NextRequest,
      { params: Promise.resolve({ id: '1' }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
  });

  it('returns 400 for invalid trip id', async () => {
    mockGetTenantContext.mockResolvedValue({ organizationId: 1, branchId: 2, userId: 'user-1' });

    const response = await checkpointPost(
      new Request('https://app.test/api/tms/trips/abc/checkpoint', { method: 'POST', body: JSON.stringify({}) }) as NextRequest,
      { params: Promise.resolve({ id: 'abc' }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid trip id' });
  });

  it('returns 401 when tenant context is missing', async () => {
    mockGetTenantContext.mockResolvedValue(null);

    const response = await checkpointPost(
      new Request('https://app.test/api/tms/trips/1/checkpoint', { method: 'POST', body: JSON.stringify({}) }) as NextRequest,
      { params: Promise.resolve({ id: '1' }) },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  it('creates checkpoint with trimmed values and Date conversion on happy path', async () => {
    mockGetTenantContext.mockResolvedValue({ organizationId: 1, branchId: 2, userId: 'user-1' });
    mockQueryFirst.mockResolvedValue({ id: 1 });
    const recordedAt = '2024-01-01T10:00:00.000Z';

    const response = await checkpointPost(
      new Request('https://app.test/api/tms/trips/1/checkpoint', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          checkpointType: '  ARRIVAL ',
          description: '  reached dock  ',
          recordedAt,
        }),
      }) as NextRequest,
      { params: Promise.resolve({ id: '1' }) },
    );

    const responseBody = await response.json();
    expect({ status: response.status, body: responseBody }).toEqual({
      status: 200,
      body: { success: true },
    });

    expect(insertValues).toHaveBeenCalledTimes(1);
    const payload = insertValues.mock.calls[0][0];
    expect(payload.checkpointType).toBe('ARRIVAL');
    expect(payload.description).toBe('reached dock');
    expect(payload.recordedAt).toBeInstanceOf(Date);
    expect((payload.recordedAt as Date).toISOString()).toBe(recordedAt);
  });

  it('POST /tms/trips returns 400 for invalid JSON', async () => {
    mockGetTenantContext.mockResolvedValue({ organizationId: 1, branchId: 2, userId: 'u1', defaultBranchId: 2 });

    const response = await tripsPost(
      new Request('https://app.test/api/tms/trips', { method: 'POST', body: 'not-json' }) as NextRequest,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
  });

  it('PUT /tms/trips/:id returns 400 for invalid JSON', async () => {
    mockGetTenantContext.mockResolvedValue({ organizationId: 1, branchId: 2, userId: 'u1' });

    const response = await tripPut(
      new Request('https://app.test/api/tms/trips/1', { method: 'PUT', body: 'not-json' }) as NextRequest,
      { params: Promise.resolve({ id: '1' }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
  });

  it('POST /tms/trips/ssrm returns 400 for invalid JSON', async () => {
    mockGetTenantContext.mockResolvedValue({ organizationId: 1, branchId: 2, userId: 'u1' });

    const response = await ssrmPost(
      new Request('https://app.test/api/tms/trips/ssrm', { method: 'POST', body: 'not-json' }) as NextRequest,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
  });

  it('POST /tms/trips enforces CIOT rule with 400', async () => {
    mockGetTenantContext.mockResolvedValue({ organizationId: 1, branchId: 2, userId: 'u1', defaultBranchId: 2 });

    const response = await tripsPost(
      new Request('https://app.test/api/tms/trips', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          vehicleId: 10,
          driverId: 20,
          driverType: 'THIRD_PARTY',
          pickupOrderIds: [],
        }),
      }) as NextRequest,
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid request body');
    // Ensure the validation points to CIOT
    expect(JSON.stringify(body.details ?? '')).toMatch(/ciotNumber/i);
  });
});
