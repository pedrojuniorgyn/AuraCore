import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('SCHEMA-003: Composite Index Validation', () => {
  const modulesDir = join(process.cwd(), 'src/modules');

  function findSchemaFiles(dir: string): string[] {
    const files: string[] = [];
    function walk(d: string): void {
      try {
        for (const e of readdirSync(d, { withFileTypes: true })) {
          const p = join(d, e.name);
          if (e.isDirectory() && e.name !== 'node_modules') walk(p);
          else if (e.isFile() && e.name.endsWith('.schema.ts')) files.push(p);
        }
      } catch { /* ignore */ }
    }
    walk(dir);
    return files;
  }

  const schemas = findSchemaFiles(modulesDir);

  it('valida índice composto em schemas multi-tenant', () => {
    for (const file of schemas) {
      const content = readFileSync(file, 'utf-8');
      if (!content.includes('organizationId')) continue;
      
      const hasComposite = /index\s*\([^)]+\)\s*\.\s*on\s*\([^)]*organizationId[^)]*branchId/.test(content);
      expect(hasComposite, `${file} deve ter índice composto`).toBe(true);
    }
  });
});

