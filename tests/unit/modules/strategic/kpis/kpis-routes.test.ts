import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as createKpi, GET as listKpis } from '@/app/api/strategic/kpis/route';
import { GET as getKpi, DELETE as deleteKpi } from '@/app/api/strategic/kpis/[id]/route';
import { getTenantContext } from '@/lib/auth/context';
import { container } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { createAuthenticatedRequest } from '@/tests/helpers/nextRequestHelper';
import type { NextRequest } from 'next/server';

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

const ORG_ID = 'test-org-id';
const BRANCH_ID = 1;

const validId = '123e4567-e89b-12d3-a456-426614174000';

const makeReq = (jsonImpl: () => Promise<unknown> | unknown, url = 'http://localhost/api') =>
  ({ json: jsonImpl, url } as unknown as NextRequest);

describe('strategic kpis routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantContext.mockResolvedValue(tenant);
  });

  it('returns 400 on invalid JSON body for create', async () => {
    const response = await createKpi(makeReq(vi.fn().mockRejectedValue(new Error('bad json'))));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid JSON body');
  });

  it('returns 400 when id is not uuid', async () => {
    const response = await getKpi({} as NextRequest, { params: Promise.resolve({ id: 'invalid' }) });
    expect(response.status).toBe(400);
  });

  it('returns 401 when tenant context is missing (list)', async () => {
    mockGetTenantContext.mockResolvedValueOnce(null);

    const response = await listKpis(
      createAuthenticatedRequest('/api/strategic/kpis', ORG_ID, BRANCH_ID)
    );
    expect(response.status).toBe(401);
  });

  it('passes trimmed strings and Date when creating', async () => {
    const execute = vi.fn().mockResolvedValue(
      Result.ok({
        id: 'kpi-1',
        code: 'KPI1',
      })
    );
    mockContainerResolve.mockReturnValue({ execute });

    const response = await createKpi(
      makeReq(
        vi.fn().mockResolvedValue({
          code: '  KPI1 ',
          name: ' Name ',
          unit: ' % ',
          targetValue: 10,
          baselineValue: 1,
        })
      )
    );

    expect(response.status).toBe(201);
    expect(execute).toHaveBeenCalledTimes(1);
    const [input] = execute.mock.calls[0];
    expect(input.code).toBe('KPI1');
    expect(input.name).toBe('Name');
    expect(input.unit).toBe('%');
  });
});
