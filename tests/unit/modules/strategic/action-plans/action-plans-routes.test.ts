import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST as createActionPlan } from '@/app/api/strategic/action-plans/route';
import { PATCH as updateStatus } from '@/app/api/strategic/action-plans/[id]/status/route';
import { POST as followUp } from '@/app/api/strategic/action-plans/[id]/follow-up/route';
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
  ({ json: jsonImpl } as unknown as NextRequest);

describe('action-plans routes hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantContext.mockResolvedValue(tenant);
  });

  it('returns 400 on invalid JSON body for create', async () => {
    const response = await createActionPlan(
      makeRequest(vi.fn().mockRejectedValue(new Error('bad json')))
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid JSON body');
  });

  it('returns 400 when id is not uuid in status route', async () => {
    const response = await updateStatus({} as NextRequest, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 when follow-up schema has invalid dates', async () => {
    const response = await followUp(
      makeRequest(
        vi.fn().mockResolvedValue({
          followUpDate: 'invalid-date',
          gembaLocal: 'floor',
          gembutsuObservation: 'obs',
          genjitsuData: 'data',
          executionStatus: 'EXECUTED_OK',
          executionPercent: 50,
        })
      ),
      { params: Promise.resolve({ id: validId }) }
    );

    expect(response.status).toBe(400);
  });

  it('passes Date objects to use case when dates are valid', async () => {
    const execute = vi.fn().mockResolvedValue(
      Result.ok({
        id: 'ap-1',
        code: 'AP-1',
        what: 'x',
        pdcaCycle: 'PLAN',
      })
    );
    mockContainerResolve.mockReturnValue({ execute });

    const response = await createActionPlan(
      makeRequest(
        vi.fn().mockResolvedValue({
          what: 'What',
          why: 'Why',
          whereLocation: 'Where',
          whenStart: '2024-01-01T00:00:00.000Z',
          whenEnd: '2024-01-02T00:00:00.000Z',
          who: 'Who',
          whoUserId: validId,
          how: 'How',
          priority: 'LOW',
        })
      )
    );

    expect(response.status).toBe(201);
    expect(execute).toHaveBeenCalledTimes(1);
    const [input] = execute.mock.calls[0];
    expect(input.whenStart instanceof Date).toBe(true);
    expect(input.whenEnd instanceof Date).toBe(true);
  });

  it('accepts UI payload shape and defaults optional fields', async () => {
    const execute = vi.fn().mockResolvedValue(
      Result.ok({
        id: 'ap-2',
        code: 'AP-2',
        what: 'Improve process',
        pdcaCycle: 'PLAN',
      })
    );
    mockContainerResolve.mockReturnValue({ execute });

    const response = await createActionPlan(
      makeRequest(
        vi.fn().mockResolvedValue({
          what: '   Improve process   ',
          why: '   Efficiency   ',
          whereLocation: undefined,
          whenStart: '2024-05-01',
          whenEnd: '2024-06-01',
          who: '  Alice  ',
          whoUserId: validId,
          how: '   Automate   ',
          howMuchAmount: undefined,
          priority: undefined,
        })
      )
    );

    expect(response.status).toBe(201);
    expect(execute).toHaveBeenCalledTimes(1);
    const [input] = execute.mock.calls[0];
    expect(input.what).toBe('Improve process');
    expect(input.why).toBe('Efficiency');
    expect(input.priority).toBe('MEDIUM');
    expect(input.howMuchCurrency).toBe('BRL');
    expect(input.whenStart instanceof Date).toBe(true);
    expect(input.whenEnd instanceof Date).toBe(true);
  });
});
