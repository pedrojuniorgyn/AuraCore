#!/usr/bin/env node
/**
 * Fix remaining 'params' references after withDI migration
 * Changes: `await params` → `await context.params`
 * And: `params.id` → `(await context.params).id` etc.
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const isDryRun = process.argv.includes('--dry');

let modified = 0;
let fixes = 0;

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      yield* walkDir(path);
    } else if (entry.name === 'route.ts') {
      yield path;
    }
  }
}

async function main() {
  for await (const filePath of walkDir(join(ROOT, 'src/app/api'))) {
    const content = await readFile(filePath, 'utf-8');
    
    // Only process files that use withDI with context
    if (!content.includes('context: RouteContext') && !content.includes('context.params')) continue;
    
    let changed = content;
    let fileFixed = 0;

    // Fix: const { id } = await params; → const { id } = await context.params;
    const r1 = changed.replace(/= await params\b(?!\.)/g, '= await context.params');
    if (r1 !== changed) { fileFixed += (r1.match(/context\.params/g)?.length || 0) - (changed.match(/context\.params/g)?.length || 0); changed = r1; }

    // Fix: const resolvedParams = await params; → await context.params
    const r2 = changed.replace(/await params\b(?!\.)/g, 'await context.params');
    if (r2 !== changed) { fileFixed += (r2.match(/context\.params/g)?.length || 0) - (changed.match(/context\.params/g)?.length || 0); changed = r2; }

    if (fileFixed > 0) {
      modified++;
      fixes += fileFixed;
      const rel = relative(ROOT, filePath);
      if (isDryRun) {
        console.log(`  ${rel}: ${fileFixed} fix(es)`);
      } else {
        await writeFile(filePath, changed, 'utf-8');
        console.log(`  ✅ ${rel}: ${fileFixed} fix(es)`);
      }
    }
  }
  
  console.log(`\nModified: ${modified} files, ${fixes} fixes`);
}

main().catch(console.error);
