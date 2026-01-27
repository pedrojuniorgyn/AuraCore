import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH as patchGoal } from '@/app/api/strategic/goals/[id]/route';
import { POST as createGoal } from '@/app/api/strategic/goals/route';
import { GET as getTree } from '@/app/api/strategic/goals/tree/route';
import { getTenantContext } from '@/lib/auth/context';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';

vi.mock('@/lib/auth/context', () => ({
  getTenantContext: vi.fn(),
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

const mockGetTenantContext = getTenantContext as unknown as ReturnType<typeof vi.fn>;
const mockContainerResolve = container.resolve as unknown as ReturnType<typeof vi.fn>;

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

const makeRequest = (jsonImpl: () => Promise<unknown> | unknown) =>
  ({ json: jsonImpl } as unknown as Request);

describe('strategic goals routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantContext.mockResolvedValue(tenant);
  });

  it('returns 400 on invalid JSON body for create', async () => {
    const response = await createGoal(
      makeRequest(vi.fn().mockRejectedValue(new Error('bad json'))) as unknown as Request
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid JSON body');
  });

  it('returns 400 when id is not uuid in patch', async () => {
    const response = await patchGoal(
      makeRequest(vi.fn().mockResolvedValue({ currentValue: 10 })) as unknown as Request,
      { params: Promise.resolve({ id: 'not-uuid' }) }
    );

    expect(response.status).toBe(400);
  });

  it('returns 401 when tenant context is missing (tree)', async () => {
    mockGetTenantContext.mockResolvedValueOnce(null);

    const response = await getTree({ url: 'http://localhost/api/strategic/goals/tree' } as Request);

    expect(response.status).toBe(401);
  });

  it('passes Date objects and returns 201 on create', async () => {
    const execute = vi.fn().mockResolvedValue(
      Result.ok({
        id: 'goal-1',
        code: 'G-1',
        description: 'Goal',
        cascadeLevel: 'CEO',
      })
    );
    mockContainerResolve.mockReturnValue({ execute });

    const response = await createGoal(
      makeRequest(
        vi.fn().mockResolvedValue({
          strategyId: validId,
          perspectiveCode: 'FIN',
          perspective: 'FINANCIAL',
          perspectiveId: validId,
          description: 'desc',
          targetValue: 10,
          unit: '%',
          code: 'G1',
          cascadeLevel: 'STRATEGIC',
          startDate: '2024-01-01',
          endDate: '2024-02-01',
        })
      ) as unknown as Request
    );

    const json = await response.json();

    expect(response.status).toBe(201);
    expect(execute).toHaveBeenCalledTimes(1);
    const [input] = execute.mock.calls[0];
    expect(input.startDate instanceof Date).toBe(true);
    expect(input.dueDate instanceof Date).toBe(true);
    expect(json.id).toBe('goal-1');
  });

  it('returns 401 when tenant is missing on create', async () => {
    mockGetTenantContext.mockResolvedValueOnce(null);

    const response = await createGoal(
      makeRequest(vi.fn().mockResolvedValue({ code: 'G1' })) as unknown as Request
    );

    expect(response.status).toBe(401);
  });
});
