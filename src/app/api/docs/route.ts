/**
 * OpenAPI Spec Endpoint
 *
 * Retorna a especificação OpenAPI 3.0 em JSON.
 * Consumido pelo Swagger UI em /docs
 *
 * @example GET /api/docs
 */

import { NextResponse } from 'next/server';
import { getApiDocs } from '@/lib/swagger/config';
import { withDI } from '@/shared/infrastructure/di/with-di';

export const GET = withDI(async () => {
  const spec = getApiDocs();
  return NextResponse.json(spec);
});
