import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as followUpHandler } from '@/app/api/strategic/action-plans/[id]/follow-up/route';
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

const mockGetTenantContext = getTenantContext as unknown as ReturnType<typeof vi.fn>;
const mockContainerResolve = container.resolve as unknown as ReturnType<typeof vi.fn>;

const tenant = {
  userId: 'user-1',
  organizationId: 10,
  branchId: 20,
  role: 'USER',
  defaultBranchId: 20,
  allowedBranches: [20],
  isAdmin: false,
};

const actionPlanId = '123e4567-e89b-12d3-a456-426614174000';

const makeRequest = (body: BodyInit | null) =>
  new Request(`http://localhost/api/strategic/action-plans/${actionPlanId}/follow-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

describe('action-plans follow-up route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantContext.mockResolvedValue(tenant);
  });

  it('returns 400 when JSON body is invalid', async () => {
    const response = await followUpHandler(
      makeRequest('not-a-json'),
      { params: Promise.resolve({ id: actionPlanId }) }
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid JSON body');
  });

  it('preserves getTenantContext response (missing tenant)', async () => {
    mockGetTenantContext.mockRejectedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const response = await followUpHandler(
      makeRequest(
        JSON.stringify({
          followUpDate: '2024-01-01T00:00:00.000Z',
          gembaLocal: 'shop floor',
          gembutsuObservation: 'observation',
          genjitsuData: 'data',
          executionStatus: 'EXECUTED_OK',
          executionPercent: 50,
        })
      ),
      { params: Promise.resolve({ id: actionPlanId }) }
    );

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 201 when follow-up is created successfully', async () => {
    const execute = vi.fn().mockResolvedValue(
      Result.ok({
        followUpId: 'fu-1',
        followUpNumber: 1,
        message: 'Follow-up recorded',
      })
    );
    mockContainerResolve.mockReturnValue({ execute });

    const response = await followUpHandler(
      makeRequest(
        JSON.stringify({
          followUpDate: '2024-01-01T00:00:00.000Z',
          gembaLocal: 'shop floor',
          gembutsuObservation: 'observation',
          genjitsuData: 'data',
          executionStatus: 'EXECUTED_OK',
          executionPercent: 75,
        })
      ),
      { params: Promise.resolve({ id: actionPlanId }) }
    );

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.followUpId).toBe('fu-1');
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
