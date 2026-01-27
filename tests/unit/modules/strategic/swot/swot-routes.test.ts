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

describe('swot routes hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantContext.mockResolvedValue(tenant);
  });

  it('returns 400 on invalid JSON body', async () => {
    const response = await createSwotItem(
      makeRequest(vi.fn().mockRejectedValue(new Error('bad json')))
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid JSON body');
  });

  it('returns 401 when tenant is missing', async () => {
    mockGetTenantContext.mockRejectedValue(new Response(null, { status: 401 }));

    const response = await createSwotItem(
      makeRequest(
        vi.fn().mockResolvedValue({
          quadrant: 'STRENGTH',
          title: 'Team',
        })
      )
    );

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('accepts UI payload and passes normalized data to use case', async () => {
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
          title: '  Equipe qualificada  ',
          description: '  Experiência comprovada  ',
          impactScore: 4,
          probabilityScore: 0,
        })
      )
    );

    expect(response.status).toBe(201);
    expect(execute).toHaveBeenCalledTimes(1);
    const [input, context] = execute.mock.calls[0];
    expect(context).toEqual(tenant);
    expect(input).toEqual(
      expect.objectContaining({
        quadrant: 'STRENGTH',
        title: 'Equipe qualificada',
        description: 'Experiência comprovada',
        impactScore: 4,
        probabilityScore: 0,
      })
    );
  });
});
