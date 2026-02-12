#!/usr/bin/env node
/**
 * Fix logger argument order
 * 
 * The PinoLogger wrapper uses console.log-style API:
 *   logger.info(message, ...args)
 *   logger.error(message, error?, ...args)
 *   logger.warn(message, ...args)
 * 
 * The codemod incorrectly generated Pino-native API:
 *   logger.info({ key: val }, 'message')  ← WRONG
 *   logger.error({ err: ... }, 'message') ← WRONG
 * 
 * This script fixes the argument order.
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry');

const TARGETS = ['src/modules', 'src/app/api'];

let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      yield* walkDir(path);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.spec.ts')) {
      yield path;
    }
  }
}

function transformFile(content) {
  let modified = content;
  let replacements = 0;

  // Fix Pattern 1: logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'message')
  // → logger.error('message', error)
  modified = modified.replace(
    /logger\.error\(\s*\{\s*err:\s*(\w+)\s+instanceof\s+Error\s*\?\s*\1\s*:\s*new\s+Error\(String\(\1\)\)\s*\}\s*,\s*(['"`])([^'"`]*?)\2\s*\)/g,
    (match, errorVar, quote, message) => {
      replacements++;
      return `logger.error(${quote}${message}${quote}, ${errorVar})`;
    }
  );

  // Fix Pattern 2: logger.error({ errorMessage: error.message, errorStack: error.stack }, 'message')
  // → logger.error('message', error)
  modified = modified.replace(
    /logger\.error\(\s*\{\s*errorMessage:\s*(\w+)\.message\s*,\s*errorStack:\s*\1\.stack\s*\}\s*,\s*(['"`])([^'"`]*?)\2\s*\)/g,
    (match, errorVar, quote, message) => {
      replacements++;
      return `logger.error(${quote}${message}${quote}, ${errorVar})`;
    }
  );

  // Fix Pattern 3: logger.error({ detail: expr }, 'message')
  // → logger.error('message', expr)
  modified = modified.replace(
    /logger\.error\(\s*\{\s*detail:\s*([^}]+?)\s*\}\s*,\s*(['"`])([^'"`]*?)\2\s*\)/g,
    (match, detail, quote, message) => {
      replacements++;
      return `logger.error(${quote}${message}${quote}, ${detail.trim()})`;
    }
  );

  // Fix Pattern 4: logger.info({ detail: expr }, 'message')
  // → logger.info('message', expr)
  modified = modified.replace(
    /logger\.info\(\s*\{\s*detail:\s*([^}]+?)\s*\}\s*,\s*(['"`])([^'"`]*?)\2\s*\)/g,
    (match, detail, quote, message) => {
      replacements++;
      return `logger.info(${quote}${message}${quote}, ${detail.trim()})`;
    }
  );

  // Fix Pattern 5: logger.info({ varName }, 'message')
  // → logger.info('message', varName) -- but only for simple var names
  modified = modified.replace(
    /logger\.info\(\s*\{\s*(\w+)\s*\}\s*,\s*(['"`])([^'"`]*?)\2\s*\)/g,
    (match, varName, quote, message) => {
      replacements++;
      return `logger.info(${quote}${message}${quote}, ${varName})`;
    }
  );

  // Fix Pattern 6: logger.warn({ detail: expr }, 'message')
  // → logger.warn('message', expr)
  modified = modified.replace(
    /logger\.warn\(\s*\{\s*detail:\s*([^}]+?)\s*\}\s*,\s*(['"`])([^'"`]*?)\2\s*\)/g,
    (match, detail, quote, message) => {
      replacements++;
      return `logger.warn(${quote}${message}${quote}, ${detail.trim()})`;
    }
  );

  // Fix Pattern 7: logger.error({ errorMessage: String(error) }, 'message')
  // → logger.error('message', error)
  modified = modified.replace(
    /logger\.error\(\s*\{\s*errorMessage:\s*String\((\w+)\)\s*\}\s*,\s*(['"`])([^'"`]*?)\2\s*\)/g,
    (match, errorVar, quote, message) => {
      replacements++;
      return `logger.error(${quote}${message}${quote}, ${errorVar})`;
    }
  );

  // Fix Pattern 8: logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'message')
  // (with template literal message)
  modified = modified.replace(
    /logger\.error\(\s*\{\s*err:\s*(\w+)\s+instanceof\s+Error\s*\?\s*\1\s*:\s*new\s+Error\(String\(\1\)\)\s*\}\s*,\s*(`[^`]*`)\s*\)/g,
    (match, errorVar, template) => {
      replacements++;
      return `logger.error(${template}, ${errorVar})`;
    }
  );

  return { modified, replacements };
}

async function main() {
  console.log(`=== Logger Args Fix ===`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}\n`);

  for (const target of TARGETS) {
    const targetPath = join(ROOT, target);
    try { await stat(targetPath); } catch { continue; }

    for await (const filePath of walkDir(targetPath)) {
      totalFiles++;
      const content = await readFile(filePath, 'utf-8');
      
      if (!content.includes('logger.error(') && !content.includes('logger.info(') && !content.includes('logger.warn(')) continue;
      
      const { modified, replacements } = transformFile(content);
      
      if (replacements > 0) {
        modifiedFiles++;
        totalReplacements += replacements;
        const rel = relative(ROOT, filePath);
        
        if (isDryRun) {
          console.log(`  ${rel}: ${replacements} fix(es)`);
        } else {
          await writeFile(filePath, modified, 'utf-8');
          console.log(`  ✅ ${rel}: ${replacements} fix(es)`);
        }
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Files scanned: ${totalFiles}`);
  console.log(`Files ${isDryRun ? 'to fix' : 'fixed'}: ${modifiedFiles}`);
  console.log(`Total fixes: ${totalReplacements}`);
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
