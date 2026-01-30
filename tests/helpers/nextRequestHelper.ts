/**
 * Test Helper: NextRequest Factory
 * Cria instâncias de NextRequest para testes de API routes
 *
 * ⚠️ MULTI-TENANCY: Sempre incluir headers de org+branch nos testes
 *
 * @module tests/helpers
 */
import { NextRequest } from 'next/server';

export interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  searchParams?: Record<string, string>;
}

/**
 * Cria um NextRequest mockado para testes
 */
export function createMockNextRequest(
  path: string,
  options: MockRequestOptions = {}
): NextRequest {
  const {
    method = 'GET',
    headers = {},
    body,
    searchParams = {}
  } = options;

  // Construir URL com search params
  const url = new URL(path, 'http://localhost:3000');
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  // Construir init do request
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(url, init);
}

/**
 * Cria headers de autenticação mockados
 * ⚠️ MULTI-TENANCY: Sempre incluir organizationId E branchId
 */
export function createMockAuthHeaders(
  organizationId: string,
  branchId: number,
  userId: string = 'test-user-id'
): Record<string, string> {
  return {
    'x-organization-id': organizationId,
    'x-branch-id': String(branchId),
    'x-user-id': userId,
  };
}

/**
 * Cria NextRequest com headers de auth padrão
 */
export function createAuthenticatedRequest(
  path: string,
  organizationId: string,
  branchId: number,
  options: Omit<MockRequestOptions, 'headers'> & { extraHeaders?: Record<string, string> } = {}
): NextRequest {
  const { extraHeaders = {}, ...restOptions } = options;

  return createMockNextRequest(path, {
    ...restOptions,
    headers: {
      ...createMockAuthHeaders(organizationId, branchId),
      ...extraHeaders,
    },
  });
}
