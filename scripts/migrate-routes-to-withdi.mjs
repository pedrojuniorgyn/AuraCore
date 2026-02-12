#!/usr/bin/env node
/**
 * Codemod: Migrate export async function to withDI wrapper
 * 
 * @see E14 - Route Migration
 * 
 * Usage:
 *   node scripts/migrate-routes-to-withdi.mjs --dry src/app/api/strategic
 *   node scripts/migrate-routes-to-withdi.mjs src/app/api/strategic
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry');
const targets = args.filter(a => !a.startsWith('--'));
if (targets.length === 0) targets.push('src/app/api');

const WITHDI_IMPORT = `import { withDI } from '@/shared/infrastructure/di/with-di';`;
const WITHDI_CONTEXT_IMPORT = `import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';`;

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
    } else if (entry.name === 'route.ts') {
      yield path;
    }
  }
}

function transformFile(content) {
  let modified = content;
  let replacements = 0;
  let needsParams = false;
  
  // Already uses withDI for ALL handlers? Skip
  const exportFuncMatch = modified.match(/^export async function (GET|POST|PUT|PATCH|DELETE)/gm);
  if (!exportFuncMatch) return { modified: content, replacements: 0 };

  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  for (const method of methods) {
    // Pattern 1: export async function METHOD(request, { params }: { params: Promise<{ ... }> })
    const paramRegex = new RegExp(
      `export async function ${method}\\(\\s*` +
      `(\\w+):\\s*(?:NextRequest|Request)\\s*,\\s*` +
      `\\{\\s*params\\s*\\}:\\s*\\{\\s*params:\\s*Promise<[^>]+>\\s*\\}\\s*\\)\\s*\\{`,
      'g'
    );
    
    let match = paramRegex.exec(modified);
    if (match) {
      needsParams = true;
      const reqName = match[1];
      const reqType = modified.slice(match.index).match(/(\w+):\s*(NextRequest|Request)/)?.[2] || 'NextRequest';
      modified = modified.replace(match[0], 
        `export const ${method} = withDI(async (\n  ${reqName}: ${reqType},\n  context: RouteContext\n) => {`
      );
      // Replace "await params" with "await context.params"
      modified = modified.replace(/const\s*(\{[^}]+\})\s*=\s*await\s+params\s*;/g, 
        'const $1 = await context.params;'
      );
      replacements++;
    }
    
    // Pattern 2: export async function METHOD(request: NextRequest)
    const simpleRegex = new RegExp(
      `export async function ${method}\\(\\s*(\\w+):\\s*(NextRequest|Request)\\s*\\)\\s*\\{`,
      'g'
    );
    
    match = simpleRegex.exec(modified);
    if (match) {
      const reqName = match[1];
      const reqType = match[2];
      modified = modified.replace(match[0], 
        `export const ${method} = withDI(async (${reqName}: ${reqType}) => {`
      );
      replacements++;
    }

    // Pattern 3: export async function METHOD(req: Request) - short name
    const shortRegex = new RegExp(
      `export async function ${method}\\(\\s*(\\w+):\\s*(Request|NextRequest)\\s*\\)\\s*\\{`,
      'g'
    );
    match = shortRegex.exec(modified);
    if (match) {
      const reqName = match[1];
      const reqType = match[2];
      modified = modified.replace(match[0], 
        `export const ${method} = withDI(async (${reqName}: ${reqType}) => {`
      );
      replacements++;
    }

    // Pattern 4: export async function METHOD() - no request param
    const noArgRegex = new RegExp(
      `export async function ${method}\\(\\s*\\)\\s*\\{`,
      'g'
    );
    match = noArgRegex.exec(modified);
    if (match) {
      modified = modified.replace(match[0], 
        `export const ${method} = withDI(async () => {`
      );
      replacements++;
    }
  }

  if (replacements === 0) return { modified: content, replacements: 0 };

  // Now close each withDI handler - find the last } of each handler
  // This is tricky because we need to match the closing brace
  // We'll use a different approach: count opening/closing braces
  for (const method of methods) {
    const marker = `export const ${method} = withDI(async`;
    const markerIdx = modified.indexOf(marker);
    if (markerIdx === -1) continue;
    
    // Find the opening brace of the handler
    const afterMarker = modified.indexOf('{', markerIdx);
    if (afterMarker === -1) continue;
    
    // Find the matching closing brace
    let depth = 1;
    let i = afterMarker + 1;
    while (i < modified.length && depth > 0) {
      if (modified[i] === '{') depth++;
      if (modified[i] === '}') depth--;
      i++;
    }
    
    // i now points to just after the closing }
    // Check if next non-whitespace is another export or end of file
    const closingBraceIdx = i - 1;
    
    // Replace the closing brace with });
    const before = modified.slice(0, closingBraceIdx);
    const after = modified.slice(closingBraceIdx + 1);
    modified = before + '});' + after;
  }

  // Add withDI import if not present
  if (!modified.includes("from '@/shared/infrastructure/di/with-di'")) {
    const importToAdd = needsParams ? WITHDI_CONTEXT_IMPORT : WITHDI_IMPORT;
    
    // Find the last complete import
    const lines = modified.split('\n');
    let lastImportLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.endsWith("';") || trimmed.endsWith('";')) {
        let j = i;
        while (j >= 0) {
          const lt = lines[j].trim();
          if (lt.startsWith('import ') || lt.startsWith('import{')) {
            lastImportLineIdx = i;
            break;
          }
          if (lt.startsWith('}') || lt.endsWith(',') || /^\w+,?\s*$/.test(lt) || lt.startsWith('type ')) {
            j--; continue;
          }
          break;
        }
      }
      if (trimmed && !trimmed.startsWith('import') && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*') && !trimmed.startsWith('}') && !trimmed.endsWith(',') && !trimmed.startsWith('{') && !trimmed.startsWith('type ') && i > 5) break;
    }
    
    if (lastImportLineIdx >= 0) {
      lines.splice(lastImportLineIdx + 1, 0, importToAdd);
      modified = lines.join('\n');
    }
  } else if (needsParams && !modified.includes('RouteContext')) {
    // Already has withDI import but needs RouteContext
    modified = modified.replace(
      /import\s*\{\s*withDI\s*\}\s*from\s*'@\/shared\/infrastructure\/di\/with-di'/,
      "import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di'"
    );
  }

  // Remove initializeModule calls
  modified = modified.replace(/^.*?initialize\w+Module\(\);\s*\n/gm, '');
  modified = modified.replace(/^import.*?initialize\w+Module.*?\n/gm, '');

  return { modified, replacements };
}

async function main() {
  console.log(`=== Route → withDI Migration ===`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`Targets: ${targets.join(', ')}\n`);

  for (const target of targets) {
    const targetPath = join(ROOT, target);
    try { await stat(targetPath); } catch { continue; }

    for await (const filePath of walkDir(targetPath)) {
      totalFiles++;
      const content = await readFile(filePath, 'utf-8');
      const { modified, replacements } = transformFile(content);
      
      if (replacements > 0) {
        modifiedFiles++;
        totalReplacements += replacements;
        const rel = relative(ROOT, filePath);
        if (isDryRun) {
          console.log(`  ${rel}: ${replacements} handler(s)`);
        } else {
          await writeFile(filePath, modified, 'utf-8');
          console.log(`  ✅ ${rel}: ${replacements} handler(s)`);
        }
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Files scanned: ${totalFiles}`);
  console.log(`Files ${isDryRun ? 'to modify' : 'modified'}: ${modifiedFiles}`);
  console.log(`Total handlers: ${totalReplacements}`);
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
