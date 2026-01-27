import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/voice/process/route';
import { getTenantContext } from '@/lib/auth/context';

vi.mock('@/lib/auth/context', () => ({
  getTenantContext: vi.fn(),
}));

const mockGetTenantContext = getTenantContext as unknown as ReturnType<typeof vi.fn>;

const originalFetch = global.fetch;

describe('POST /api/voice/process', () => {
  beforeEach(() => {
    mockGetTenantContext.mockResolvedValue({
      userId: 'user-1',
      organizationId: 1,
      branchId: 2,
      role: 'USER',
      permissions: [],
    });

    process.env.VOICE_API_URL = 'https://voice.example.com';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.resetAllMocks();
    process.env.VOICE_API_URL = undefined;
    global.fetch = originalFetch;
  });

  it('retorna 400 quando JSON é inválido', async () => {
    const request = new Request('http://localhost/api/voice/process', {
      method: 'POST',
      body: '{invalid json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe('Invalid JSON body');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
