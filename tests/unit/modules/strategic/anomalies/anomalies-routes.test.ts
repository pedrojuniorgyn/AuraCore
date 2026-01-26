import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as createAnomaly, GET as listAnomalies } from '@/app/api/strategic/anomalies/route';
import { GET as getAnomaly, PUT as resolveAnomaly } from '@/app/api/strategic/anomalies/[id]/route';
import { POST as analyzeAnomaly } from '@/app/api/strategic/anomalies/[id]/analyze/route';
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

const makeReq = (jsonImpl: () => Promise<unknown> | unknown, url = 'http://localhost/api') =>
  ({ json: jsonImpl, url } as unknown as Request);

describe('strategic anomalies routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantContext.mockResolvedValue(tenant);
  });

  it('returns 400 on invalid JSON body for create', async () => {
    const response = await createAnomaly(makeReq(vi.fn().mockRejectedValue(new Error('bad json'))));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid JSON body');
  });

  it('returns 400 when id is not uuid', async () => {
    const response = await getAnomaly({} as Request, { params: Promise.resolve({ id: 'invalid' }) });
    expect(response.status).toBe(400);
  });

  it('returns 401 when tenant context is missing (list)', async () => {
    mockGetTenantContext.mockResolvedValueOnce(null);

    const response = await listAnomalies({ url: 'http://localhost/api/strategic/anomalies' } as Request);
    expect(response.status).toBe(401);
  });

  it('passes trimmed strings and Date when resolving', async () => {
    const response = await resolveAnomaly(
      makeReq(
        vi.fn().mockResolvedValue({
          resolution: '  fixed ',
        })
      ),
      { params: Promise.resolve({ id: validId }) }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.resolution).toBe('fixed');
    expect(new Date(json.resolvedAt)).toBeInstanceOf(Date);
  });
});
