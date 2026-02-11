import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as createGoal } from '@/app/api/strategic/goals/route';
import { getTenantContext, validateABACBranchAccess } from '@/lib/auth/context';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { createAuthenticatedRequest } from '@/tests/helpers/nextRequestHelper';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/auth/context', () => ({
  getTenantContext: vi.fn(),
  validateABACBranchAccess: vi.fn(),
  abacDeniedResponse: vi.fn(),
}));

vi.mock('@/shared/infrastructure/di/container', () => ({
  container: {
    resolve: vi.fn(),
    registerInstance: vi.fn(),
    registerSingleton: vi.fn(),
    isRegistered: vi.fn(),
  },
  injectable: () => (target: unknown) => target,
  inject: () => () => undefined,
  singleton: () => () => undefined,
  injectAll: () => () => undefined,
}));

vi.mock('@/shared/infrastructure/di/with-di', () => ({
  withDI:
    <T extends (...args: unknown[]) => unknown>(handler: T) =>
    (...args: Parameters<T>) =>
      handler(...args),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

const mockGetTenantContext = getTenantContext as unknown as ReturnType<typeof vi.fn>;
const mockContainerResolve = container.resolve as unknown as ReturnType<typeof vi.fn>;
const mockDbSelect = db.select as unknown as ReturnType<typeof vi.fn>;
const mockValidateABAC = validateABACBranchAccess as unknown as ReturnType<typeof vi.fn>;

const tenant = {
  userId: 'user-1',
  organizationId: 1,
  branchId: 2,
  role: 'USER',
  defaultBranchId: 2,
  allowedBranches: [2],
  isAdmin: false,
};

const ORG_ID = 'test-org-id';
const BRANCH_ID = 1;

const validId = '123e4567-e89b-12d3-a456-426614174000';

const makeRequest = (jsonImpl: () => Promise<unknown> | unknown) =>
  ({ json: jsonImpl } as unknown as NextRequest);

const createSelectChain = (result: Array<{ id: string }>) => {
  // Drizzle queries are thenable - `await db.select().from().where()` resolves directly
  // The mock must return a thenable (Promise) with chainable methods
  const makeThenable = () =>
    Object.assign(Promise.resolve(result), {
      orderBy: vi.fn().mockReturnValue(
        Object.assign(Promise.resolve(result), {
          offset: vi.fn().mockReturnValue(
            Object.assign(Promise.resolve(result), {
              fetch: vi.fn().mockResolvedValue(result),
            })
          ),
          fetch: vi.fn().mockResolvedValue(result),
        })
      ),
      offset: vi.fn().mockReturnValue(
        Object.assign(Promise.resolve(result), {
          fetch: vi.fn().mockResolvedValue(result),
        })
      ),
      fetch: vi.fn().mockResolvedValue(result),
    });
  const where = vi.fn().mockReturnValue(makeThenable());
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
};

const mockDbSelectSequence = (results: Array<Array<{ id: string }>>) => {
  const queue = [...results];
  mockDbSelect.mockImplementation(() => {
    const next = queue.shift() ?? [];
    return createSelectChain(next);
  });
};

describe('strategic goals create route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantContext.mockResolvedValue(tenant);
    mockValidateABAC.mockReturnValue({ allowed: true, effectiveBranchId: 2 });
  });

  it('returns 400 on invalid JSON body', async () => {
    const response = await createGoal(
      makeRequest(vi.fn().mockRejectedValue(new Error('bad json')))
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid JSON body');
  });

  it('preserves 401 response when tenant context throws Response', async () => {
    // getTenantContext() THROWS a Response on auth failure (not returns)
    mockGetTenantContext.mockRejectedValueOnce(
      new Response('Unauthorized', { status: 401 })
    );

    const response = await createGoal(
      makeRequest(vi.fn().mockResolvedValue({ code: 'G1' }))
    );

    expect(response.status).toBe(401);
  });

  it('creates goal when strategyId is provided and perspective resolves', async () => {
    // 2 db.select calls: perspectiveCode resolution + BUG-001 validation
    mockDbSelectSequence([[{ id: 'perspective-1' }], [{ id: 'perspective-1' }]]);
    const execute = vi.fn().mockResolvedValue(
      Result.ok({
        id: 'goal-1',
        code: 'G-1',
        description: 'Goal',
        cascadeLevel: 'CEO',
      })
    );
    const mockStrategyRepo = {
      findById: vi.fn().mockResolvedValue({ id: validId }),
      findActive: vi.fn(),
    };
    mockContainerResolve.mockImplementation((token: unknown) => {
      if (typeof token === 'symbol') return mockStrategyRepo;
      return { execute };
    });

    const response = await createGoal(
      makeRequest(
        vi.fn().mockResolvedValue({
          strategyId: validId,
          perspectiveCode: 'FIN',
          description: 'desc',
          targetValue: 10,
          unit: '%',
          code: 'G1',
          cascadeLevel: 'STRATEGIC',
          startDate: '2024-01-01',
          endDate: '2024-02-01',
        })
      )
    );

    expect(response.status).toBe(201);
    expect(execute).toHaveBeenCalledTimes(1);
    const [input] = execute.mock.calls[0];
    expect(input.perspectiveId).toBe('perspective-1');
  });

  it('creates goal when strategyId is absent and fallback strategy resolves', async () => {
    // 2 db.select calls: perspectiveCode resolution + BUG-001 validation
    mockDbSelectSequence([[{ id: 'perspective-1' }], [{ id: 'perspective-1' }]]);
    const execute = vi.fn().mockResolvedValue(
      Result.ok({
        id: 'goal-1',
        code: 'G-1',
        description: 'Goal',
        cascadeLevel: 'CEO',
      })
    );
    const mockStrategyRepo = {
      findById: vi.fn(),
      findActive: vi.fn().mockResolvedValue({ id: 'strategy-1' }),
    };
    mockContainerResolve.mockImplementation((token: unknown) => {
      if (typeof token === 'symbol') return mockStrategyRepo;
      return { execute };
    });

    const response = await createGoal(
      makeRequest(
        vi.fn().mockResolvedValue({
          perspectiveCode: 'FIN',
          description: 'desc',
          targetValue: 10,
          unit: '%',
          code: 'G1',
          cascadeLevel: 'STRATEGIC',
          startDate: '2024-01-01',
          endDate: '2024-02-01',
        })
      )
    );

    expect(response.status).toBe(201);
    expect(execute).toHaveBeenCalledTimes(1);
    const [input] = execute.mock.calls[0];
    expect(input.perspectiveId).toBe('perspective-1');
  });

  it('returns 400 when no strategy exists for tenant', async () => {
    mockDbSelectSequence([[], []]);
    const mockStrategyRepo = {
      findById: vi.fn(),
      findActive: vi.fn().mockResolvedValue(null),
    };
    mockContainerResolve.mockImplementation((token: unknown) => {
      if (typeof token === 'symbol') return mockStrategyRepo;
      return { execute: vi.fn() };
    });

    const response = await createGoal(
      makeRequest(
        vi.fn().mockResolvedValue({
          perspectiveCode: 'FIN',
          description: 'desc',
          targetValue: 10,
          unit: '%',
          code: 'G1',
          cascadeLevel: 'STRATEGIC',
          startDate: '2024-01-01',
          endDate: '2024-02-01',
        })
      )
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.details?.strategyId?.[0]).toContain(
      'strategyId is required'
    );
  });
});
