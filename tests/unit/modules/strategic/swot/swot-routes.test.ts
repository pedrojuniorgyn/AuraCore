import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as createSwotItem } from '@/app/api/strategic/swot/route';
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

type RouteRequest = Parameters<typeof createSwotItem>[0];

const makeRequest = (jsonImpl: () => Promise<unknown> | unknown) =>
  ({ json: jsonImpl } as unknown as RouteRequest);

describe('swot routes hotfixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantContext.mockResolvedValue(tenant);
  });

  it('preserves getTenantContext response status', async () => {
    mockGetTenantContext.mockRejectedValue(
      new Response(JSON.stringify({ error: 'Missing branch' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const response = await createSwotItem(
      makeRequest(
        vi.fn().mockResolvedValue({
          quadrant: 'STRENGTH',
          title: 'Team',
          impactScore: 3,
          probabilityScore: 0,
        })
      )
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Missing branch');
  });

  it('coerces probabilityScore 0 to 1 before use case', async () => {
    const execute = vi.fn().mockResolvedValue(
      Result.ok({
        id: 'swot-1',
        quadrant: 'STRENGTH',
        title: 'Team',
      })
    );
    mockContainerResolve.mockReturnValue({ execute });

    const response = await createSwotItem(
      makeRequest(
        vi.fn().mockResolvedValue({
          quadrant: 'STRENGTH',
          title: 'Team',
          impactScore: 4,
          probabilityScore: 0,
        })
      )
    );

    expect(response.status).toBe(201);
    expect(execute).toHaveBeenCalledTimes(1);
    const [input] = execute.mock.calls[0];
    expect(input.probabilityScore).toBe(1);
  });

  it('coerces probabilityScore < 1 to 1 before use case', async () => {
    const execute = vi.fn().mockResolvedValue(
      Result.ok({
        id: 'swot-1',
        quadrant: 'STRENGTH',
        title: 'Team',
      })
    );
    mockContainerResolve.mockReturnValue({ execute });

    const response = await createSwotItem(
      makeRequest(
        vi.fn().mockResolvedValue({
          quadrant: 'STRENGTH',
          title: 'Team',
          impactScore: 4,
          probabilityScore: 0.5,
        })
      )
    );

    expect(response.status).toBe(201);
    expect(execute).toHaveBeenCalledTimes(1);
    const [input] = execute.mock.calls[0];
    expect(input.probabilityScore).toBe(1);
  });

  it('uses default probabilityScore = 3 when omitted', async () => {
    const execute = vi.fn().mockResolvedValue(
      Result.ok({
        id: 'swot-3',
        quadrant: 'OPPORTUNITY',
        title: 'New market',
      })
    );
    mockContainerResolve.mockReturnValue({ execute });

    const response = await createSwotItem(
      makeRequest(
        vi.fn().mockResolvedValue({
          quadrant: 'OPPORTUNITY',
          title: 'New market',
          impactScore: 5,
        })
      )
    );

    expect(response.status).toBe(201);
    const [input] = execute.mock.calls[0];
    expect(input.probabilityScore).toBe(3);
  });

  it('keeps happy path returning 201', async () => {
    const execute = vi.fn().mockResolvedValue(
      Result.ok({
        id: 'swot-2',
        quadrant: 'WEAKNESS',
        title: 'Process',
      })
    );
    mockContainerResolve.mockReturnValue({ execute });

    const response = await createSwotItem(
      makeRequest(
        vi.fn().mockResolvedValue({
          quadrant: 'WEAKNESS',
          title: 'Process',
          impactScore: 2,
          probabilityScore: 3,
        })
      )
    );

    expect(response.status).toBe(201);
  });
});
