#!/usr/bin/env node
/**
 * Codemod: Migrate console.log/error to structured logger
 * 
 * @see E13.4 - Console Cleanup
 * 
 * Usage:
 *   node scripts/migrate-console-to-logger.mjs --dry    # Preview changes
 *   node scripts/migrate-console-to-logger.mjs           # Apply changes
 *   node scripts/migrate-console-to-logger.mjs --modules # Only src/modules/
 *   node scripts/migrate-console-to-logger.mjs --api     # Only src/app/api/
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry');
const onlyModules = args.includes('--modules');
const onlyApi = args.includes('--api');

const TARGETS = [];
if (onlyModules || (!onlyModules && !onlyApi)) TARGETS.push('src/modules');
if (onlyApi || (!onlyModules && !onlyApi)) TARGETS.push('src/app/api');

// Logger import to add
const LOGGER_IMPORT = `import { logger } from '@/shared/infrastructure/logging';`;

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

function isInComment(content, index) {
  // Check if position is inside a comment or JSDoc
  const before = content.slice(Math.max(0, index - 200), index);
  // Inside a line comment
  const lastNewline = before.lastIndexOf('\n');
  const currentLine = before.slice(lastNewline + 1);
  if (currentLine.includes('//') || currentLine.trimStart().startsWith('*') || currentLine.trimStart().startsWith('/*')) {
    return true;
  }
  return false;
}

function transformFile(content, filePath) {
  let modified = content;
  let replacements = 0;

  // Skip files that are jsdoc/comment only references
  // We'll check each match individually

  // Pattern 1: console.error('...message...:', error) in catch blocks
  modified = modified.replace(
    /console\.error\(\s*(['"`])([^'"`]*?)\1\s*,\s*(\w+)\s*\)/g,
    (match, quote, message, errorVar, offset) => {
      if (isInComment(modified, offset)) return match;
      replacements++;
      return `logger.error({ err: ${errorVar} instanceof Error ? ${errorVar} : new Error(String(${errorVar})) }, ${quote}${message}${quote})`;
    }
  );

  // Pattern 1b: console.error('msg:', error.message)
  modified = modified.replace(
    /console\.error\(\s*(['"`])([^'"`]*?)\1\s*,\s*(\w+\.\w+)\s*\)/g,
    (match, quote, message, expr, offset) => {
      if (isInComment(modified, offset)) return match;
      replacements++;
      return `logger.error({ detail: ${expr} }, ${quote}${message}${quote})`;
    }
  );

  // Pattern 1c: console.error('msg:', expr1, expr2) - multiple args
  modified = modified.replace(
    /console\.error\(\s*(['"`])([^'"`]*?)\1\s*,\s*([^)]+)\)/g,
    (match, quote, message, rest, offset) => {
      if (isInComment(modified, offset)) return match;
      // Skip if already replaced
      if (match.includes('logger.')) return match;
      replacements++;
      const args = rest.trim();
      return `logger.error({ detail: ${args} }, ${quote}${message}${quote})`;
    }
  );

  // Pattern 2: console.error('message') (no error arg)
  modified = modified.replace(
    /console\.error\(\s*(['"`])([^'"`]*?)\1\s*\)/g,
    (match, quote, message, offset) => {
      if (isInComment(modified, offset)) return match;
      replacements++;
      return `logger.error(${quote}${message}${quote})`;
    }
  );

  // Pattern 2b: console.error(variable) - just a variable
  modified = modified.replace(
    /console\.error\(\s*(\w+)\s*\)/g,
    (match, varName, offset) => {
      if (isInComment(modified, offset)) return match;
      if (varName === 'undefined' || varName === 'null') return match;
      replacements++;
      return `logger.error({ err: ${varName} instanceof Error ? ${varName} : new Error(String(${varName})) }, 'Error occurred')`;
    }
  );

  // Pattern 2c: console.error(variable.property) - accessor
  modified = modified.replace(
    /console\.error\(\s*(\w+\.\w+)\s*\)/g,
    (match, accessor, offset) => {
      if (isInComment(modified, offset)) return match;
      replacements++;
      return `logger.error({ detail: ${accessor} }, 'Error occurred')`;
    }
  );

  // Pattern 3: console.error(template literal)
  modified = modified.replace(
    /console\.error\(\s*(`[^`]*`)\s*\)/g,
    (match, template, offset) => {
      if (isInComment(modified, offset)) return match;
      replacements++;
      return `logger.error(${template})`;
    }
  );

  // Pattern 4: console.log('...message...:' , data)
  modified = modified.replace(
    /console\.log\(\s*(['"`])([^'"`]*?)\1\s*,\s*(\w+)\s*\)/g,
    (match, quote, message, dataVar, offset) => {
      if (isInComment(modified, offset)) return match;
      replacements++;
      return `logger.info({ ${dataVar} }, ${quote}${message}${quote})`;
    }
  );

  // Pattern 4b: console.log('msg:', expr.prop)
  modified = modified.replace(
    /console\.log\(\s*(['"`])([^'"`]*?)\1\s*,\s*([^)]+)\)/g,
    (match, quote, message, rest, offset) => {
      if (isInComment(modified, offset)) return match;
      if (match.includes('logger.')) return match;
      replacements++;
      const args = rest.trim();
      return `logger.info({ detail: ${args} }, ${quote}${message}${quote})`;
    }
  );

  // Pattern 5: console.log('message')
  modified = modified.replace(
    /console\.log\(\s*(['"`])([^'"`]*?)\1\s*\)/g,
    (match, quote, message, offset) => {
      if (isInComment(modified, offset)) return match;
      replacements++;
      return `logger.info(${quote}${message}${quote})`;
    }
  );

  // Pattern 6: console.log(template literal)
  modified = modified.replace(
    /console\.log\(\s*(`[^`]*`)\s*\)/g,
    (match, template, offset) => {
      if (isInComment(modified, offset)) return match;
      replacements++;
      return `logger.info(${template})`;
    }
  );

  // Pattern 6b: console.log(expression)
  modified = modified.replace(
    /console\.log\(\s*([^'"`\s][^)]*?)\s*\)/g,
    (match, expr, offset) => {
      if (isInComment(modified, offset)) return match;
      if (match.includes('logger.')) return match;
      replacements++;
      return `logger.info({ detail: ${expr.trim()} }, 'Log')`;
    }
  );

  // Pattern 7: console.warn('msg', data)
  modified = modified.replace(
    /console\.warn\(\s*(['"`])([^'"`]*?)\1\s*,\s*([^)]+)\)/g,
    (match, quote, message, rest, offset) => {
      if (isInComment(modified, offset)) return match;
      if (match.includes('logger.')) return match;
      replacements++;
      const args = rest.trim();
      return `logger.warn({ detail: ${args} }, ${quote}${message}${quote})`;
    }
  );

  // Pattern 7b: console.warn('msg')
  modified = modified.replace(
    /console\.warn\(\s*(['"`])([^'"`]*?)\1\s*\)/g,
    (match, quote, message, offset) => {
      if (isInComment(modified, offset)) return match;
      replacements++;
      return `logger.warn(${quote}${message}${quote})`;
    }
  );

  // If we made replacements, ensure logger import exists
  if (replacements > 0 && !modified.includes("from '@/shared/infrastructure/logging'")) {
    // Find the last line ending with '; or "; (end of a complete import)
    // This handles both single-line and multi-line imports safely
    const lines = modified.split('\n');
    let lastImportLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      // A complete import ends with '; or ";
      if (trimmed.endsWith("';") || trimmed.endsWith('";')) {
        // Check that this is part of an import block (not a random string)
        // Look backwards to confirm this is an import statement
        let j = i;
        while (j >= 0) {
          const lt = lines[j].trim();
          if (lt.startsWith('import ') || lt.startsWith('import{')) {
            lastImportLineIdx = i;
            break;
          }
          // Still part of multi-line import (has comma, closing brace, type names)
          if (lt.startsWith('}') || lt.endsWith(',') || /^\w+,?\s*$/.test(lt) || lt.startsWith('type ')) {
            j--;
            continue;
          }
          break;
        }
      }
      // Stop scanning after first non-import, non-comment, non-empty line
      if (trimmed && !trimmed.startsWith('import') && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*') && !trimmed.startsWith('}') && !trimmed.endsWith(',') && !trimmed.startsWith('{') && !trimmed.startsWith('type ') && i > 5) {
        break;
      }
    }
    
    if (lastImportLineIdx >= 0) {
      lines.splice(lastImportLineIdx + 1, 0, LOGGER_IMPORT);
      modified = lines.join('\n');
    } else {
      modified = LOGGER_IMPORT + '\n' + modified;
    }
  }

  return { modified, replacements };
}

async function main() {
  console.log(`=== Console → Logger Migration ===`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`Targets: ${TARGETS.join(', ')}\n`);

  for (const target of TARGETS) {
    const targetPath = join(ROOT, target);
    
    try {
      await stat(targetPath);
    } catch {
      console.log(`Skipping: ${target} (not found)`);
      continue;
    }

    for await (const filePath of walkDir(targetPath)) {
      totalFiles++;
      const content = await readFile(filePath, 'utf-8');
      
      if (!content.includes('console.log') && !content.includes('console.error') && !content.includes('console.warn')) {
        continue;
      }

      const { modified, replacements } = transformFile(content, filePath);
      
      if (replacements > 0) {
        modifiedFiles++;
        totalReplacements += replacements;
        const rel = relative(ROOT, filePath);
        
        if (isDryRun) {
          console.log(`  ${rel}: ${replacements} replacement(s)`);
        } else {
          await writeFile(filePath, modified, 'utf-8');
          console.log(`  ✅ ${rel}: ${replacements} replacement(s)`);
        }
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Files scanned: ${totalFiles}`);
  console.log(`Files ${isDryRun ? 'to modify' : 'modified'}: ${modifiedFiles}`);
  console.log(`Total replacements: ${totalReplacements}`);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
