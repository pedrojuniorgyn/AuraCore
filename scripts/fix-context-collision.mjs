#!/usr/bin/env node
/**
 * Fix context name collision between RouteContext and getTenantContext
 * 
 * Problem: Both the handler parameter and getTenantContext() result are named 'context'
 * Fix: Rename handler parameter from 'context' to 'routeCtx'
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const isDryRun = process.argv.includes('--dry');
let modified = 0;

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
    
    // Only fix files that have BOTH context: RouteContext AND getTenantContext
    if (!content.includes('context: RouteContext') || !content.includes('getTenantContext')) continue;
    
    // Check for collision: const context = await getTenantContext()
    if (!content.includes('const context = await getTenantContext')) continue;
    
    let changed = content;
    
    // Rename handler parameter: context: RouteContext → routeCtx: RouteContext
    changed = changed.replace(/(\s+)context: RouteContext/g, '$1routeCtx: RouteContext');
    
    // Rename all context.params references that should be routeCtx.params
    // These are the ones right after the handler signature, before getTenantContext reassigns context
    // Pattern: await context.params → await routeCtx.params
    changed = changed.replace(/await context\.params/g, 'await routeCtx.params');
    
    if (changed !== content) {
      modified++;
      const rel = relative(ROOT, filePath);
      if (isDryRun) {
        console.log(`  ${rel}`);
      } else {
        await writeFile(filePath, changed, 'utf-8');
        console.log(`  ✅ ${rel}`);
      }
    }
  }
  
  console.log(`\nModified: ${modified} files`);
}

main().catch(console.error);
