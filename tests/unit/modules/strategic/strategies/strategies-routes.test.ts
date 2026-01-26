import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as createStrategy, GET as listStrategies } from '@/app/api/strategic/strategies/route';
import { POST as activateStrategy } from '@/app/api/strategic/strategies/[id]/activate/route';
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

type CreateReq = Parameters<typeof createStrategy>[0];
type ActivateReq = Parameters<typeof activateStrategy>[0];
type ListReq = Parameters<typeof listStrategies>[0];

const makeCreateRequest = (jsonImpl: () => Promise<unknown> | unknown): CreateReq =>
  ({ json: jsonImpl } as unknown as CreateReq);

const makeActivateRequest = (): ActivateReq =>
  ({} as unknown as ActivateReq);

const makeListRequest = (url = 'http://localhost/api/strategic/strategies'): ListReq =>
  ({ url } as unknown as ListReq);

describe('strategic strategies routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantContext.mockResolvedValue(tenant);
  });

  it('returns 400 on invalid JSON body for create', async () => {
    const response = await createStrategy(
      makeCreateRequest(vi.fn().mockRejectedValue(new Error('bad json')))
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid JSON body');
  });

  it('returns 400 when id is not uuid in activate', async () => {
    const response = await activateStrategy(makeActivateRequest(), {
      params: Promise.resolve({ id: 'invalid' }),
    });

    expect(response.status).toBe(400);
  });

  it('returns 401 when tenant context is missing (list)', async () => {
    mockGetTenantContext.mockResolvedValueOnce(null);

    const response = await listStrategies(makeListRequest());

    expect(response.status).toBe(401);
  });

  it('passes trimmed strings and Date objects on create', async () => {
    const execute = vi.fn().mockResolvedValue(
      Result.ok({
        id: 'strategy-1',
        name: 'Name',
      })
    );
    mockContainerResolve.mockReturnValue({ execute });

    const response = await createStrategy(
      makeCreateRequest(
        vi.fn().mockResolvedValue({
          name: '  Name  ',
          vision: '  Vision ',
          mission: 'Mission  ',
          values: [' value '],
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-02-01T00:00:00.000Z',
        })
      )
    );

    expect(response.status).toBe(201);
    expect(execute).toHaveBeenCalledTimes(1);
    const [input] = execute.mock.calls[0];
    expect(input.name).toBe('Name');
    expect(input.vision).toBe('Vision');
    expect(input.mission).toBe('Mission');
    expect(input.values?.[0]).toBe('value');
    expect(input.startDate instanceof Date).toBe(true);
    expect(input.endDate instanceof Date).toBe(true);
  });
});
