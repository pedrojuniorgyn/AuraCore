import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createAnomaly, GET as listAnomalies } from '@/app/api/strategic/anomalies/route';
import { GET as getAnomaly, PATCH as updateAnomaly, DELETE as deleteAnomaly } from '@/app/api/strategic/anomalies/[id]/route';
import { POST as analyzeAnomaly } from '@/app/api/strategic/anomalies/[id]/analyze/route';
import { POST as resolveAnomaly } from '@/app/api/strategic/anomalies/[id]/resolve/route';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';

vi.mock('@/lib/auth/context', () => ({
  getTenantContext: vi.fn(),
}));

vi.mock('tsyringe', () => ({
  container: {
    resolve: vi.fn(),
    register: vi.fn(),
    registerSingleton: vi.fn(),
  },
  injectable: () => (target: unknown) => target,
  inject: () => () => undefined,
}));

vi.mock('@/modules/strategic/infrastructure/di/StrategicModule', () => ({
  registerStrategicModule: vi.fn(),
}));

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

const makeNextRequest = (body: unknown, url = 'http://localhost/api') => {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
};

const makeGetRequest = (url = 'http://localhost/api') => {
  return new NextRequest(url, { method: 'GET' });
};

describe('strategic anomalies routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantContext.mockResolvedValue(tenant);
  });

  it('returns 400 when id is not uuid', async () => {
    const response = await getAnomaly(
      makeGetRequest(),
      { params: Promise.resolve({ id: 'invalid' }) }
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 on validation failure for create', async () => {
    const { container } = await import('tsyringe');
    const mockRepository = {
      findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      save: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };
    (container.resolve as ReturnType<typeof vi.fn>).mockReturnValue(mockRepository);

    const response = await createAnomaly(
      makeNextRequest({ title: '' }) // título vazio
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Validation failed');
  });

  it('returns 400 on validation failure for analyze', async () => {
    const { container } = await import('tsyringe');
    const mockAnomaly = {
      id: validId,
      registerRootCauseAnalysis: vi.fn().mockReturnValue(Result.fail('Anomalia deve estar aberta')),
    };
    const mockRepository = {
      findById: vi.fn().mockResolvedValue(mockAnomaly),
    };
    (container.resolve as ReturnType<typeof vi.fn>).mockReturnValue(mockRepository);

    const response = await analyzeAnomaly(
      makeNextRequest({ why1: 'test', why2: 'test' }),
      { params: Promise.resolve({ id: validId }) }
    );

    expect(response.status).toBe(400);
  });
});
