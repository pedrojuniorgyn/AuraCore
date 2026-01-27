import { beforeEach, describe, expect, it, vi } from 'vitest';
const { insertValues, selectChain } = vi.hoisted(() => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  };
  return { insertValues: vi.fn(), selectChain: chain };
});

import { POST as checkpointPost } from '@/app/api/tms/trips/[id]/checkpoint/route';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
import { queryFirst } from '@/lib/db/query-helpers';

vi.mock('@/lib/auth/context', () => ({
  getTenantContext: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: insertValues }),
    select: vi.fn().mockReturnValue(selectChain),
  },
}));

vi.mock('@/lib/db/query-helpers', () => ({
  queryFirst: vi.fn(),
}));

const mockGetTenantContext = getTenantContext as unknown as ReturnType<typeof vi.fn>;
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
    mockDbInsert.mockReturnValue({ values: insertValues });
    mockDbSelect.mockReturnValue(selectChain);
  });

  it('returns 400 for invalid JSON', async () => {
    mockGetTenantContext.mockResolvedValue({ organizationId: 1, branchId: 2, userId: 'user-1' });
    mockQueryFirst.mockResolvedValue({ id: 1 });

    const response = await checkpointPost(
      new Request('https://app.test/api/tms/trips/1/checkpoint', { method: 'POST', body: 'not-json' }),
      { params: Promise.resolve({ id: '1' }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
  });

  it('returns 400 for invalid trip id', async () => {
    mockGetTenantContext.mockResolvedValue({ organizationId: 1, branchId: 2, userId: 'user-1' });

    const response = await checkpointPost(
      new Request('https://app.test/api/tms/trips/abc/checkpoint', { method: 'POST', body: JSON.stringify({}) }),
      { params: Promise.resolve({ id: 'abc' }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid trip id' });
  });

  it('returns 401 when tenant context is missing', async () => {
    mockGetTenantContext.mockResolvedValue(null);

    const response = await checkpointPost(
      new Request('https://app.test/api/tms/trips/1/checkpoint', { method: 'POST', body: JSON.stringify({}) }),
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
      }),
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
});
