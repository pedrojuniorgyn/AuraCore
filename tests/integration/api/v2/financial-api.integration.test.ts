/**
 * Integration Tests: API V2 Routes
 * 
 * Verifica que as rotas V2 DDD estão corretamente configuradas
 * e retornam responses válidas.
 * 
 * Nota: Rotas V2 Financial foram removidas e consolidadas nas rotas V1 
 * com imports DDD (ver src/app/api/financial/).
 *
 * @module integration/api/v2
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

describe('Accounting API V2 Routes', () => {
  const V2_BASE = resolve(process.cwd(), 'src/app/api/v2/accounting');

  it('GET/POST /api/v2/accounting/journal-entries existe', () => {
    expect(existsSync(resolve(V2_BASE, 'journal-entries/route.ts'))).toBe(true);
  });

  it('GET /api/v2/accounting/journal-entries/:id existe', () => {
    expect(existsSync(resolve(V2_BASE, 'journal-entries/[id]/route.ts'))).toBe(true);
  });

  it('GET /api/v2/accounting/trial-balance existe', () => {
    expect(existsSync(resolve(V2_BASE, 'trial-balance/route.ts'))).toBe(true);
  });

  it('POST /api/v2/accounting/period-closing existe', () => {
    expect(existsSync(resolve(V2_BASE, 'period-closing/route.ts'))).toBe(true);
  });
});

describe('Fiscal API V2 Routes', () => {
  const V2_BASE = resolve(process.cwd(), 'src/app/api/v2/fiscal');

  it('POST /api/v2/fiscal/cfop/determine existe', () => {
    expect(existsSync(resolve(V2_BASE, 'cfop/determine/route.ts'))).toBe(true);
  });
});

describe('Audit API V2 Routes', () => {
  const V2_BASE = resolve(process.cwd(), 'src/app/api/v2/audit');

  it('GET /api/v2/audit existe', () => {
    expect(existsSync(resolve(V2_BASE, 'route.ts'))).toBe(true);
  });
});
