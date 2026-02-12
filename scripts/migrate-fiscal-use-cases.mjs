#!/usr/bin/env node
/**
 * Codemod: Migrate fiscal use-cases to commands/ and queries/
 * 
 * This script:
 * 1. Creates commands/ and queries/ directories
 * 2. Moves files with git mv
 * 3. Updates all import paths across the codebase
 * 4. Creates backward-compatible re-exports in use-cases/
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const FISCAL_APP = 'src/modules/fiscal/application';

// Classification of use cases
const COMMANDS = [
  'CreateFiscalDocumentUseCase',
  'SubmitFiscalDocumentUseCase', 
  'AuthorizeFiscalDocumentUseCase',
  'CancelFiscalDocumentUseCase',
  'CreateCteUseCase',
  'AuthorizeCteUseCase',
  'UpdateCteUseCase',
  'CancelCteUseCase',
  'DownloadNfesUseCase',
  'ImportNfeXmlUseCase',
  'ManifestNfeUseCase',
  'TransmitToSefazUseCase',
  'GenerateDanfeUseCase',
  'CalculateTaxesUseCase',
  'ProcessTaxCreditsUseCase',
  'AuditTaxTransitionUseCase',
  'CalculateCompensationUseCase',
];

const QUERIES = [
  'ListFiscalDocumentsUseCase',
  'GetFiscalDocumentByIdUseCase',
  'ListCtesUseCase',
  'GetCteByIdUseCase',
  'QuerySefazStatusUseCase',
  'GetTaxRatesUseCase',
  'SimulateTaxScenarioUseCase',
  'CompareTaxRegimesUseCase',
  'CalculateIbsCbsUseCase',
  'ValidateIbsCbsGroupUseCase',
  'ValidateFiscalDocumentUseCase',
];

// SPED commands (in sped/ subdirectory)
const SPED_COMMANDS = [
  'GenerateSpedFiscalUseCase',
  'GenerateSpedEcdUseCase', 
  'GenerateSpedContributionsUseCase',
];

// Legacy SPED use cases in use-cases/ root (deprecated, but still referenced)
const LEGACY_SPED = [
  'GenerateSpedFiscalUseCase',
  'GenerateSpedEcdUseCase',
  'GenerateSpedContributionsUseCase',
];

console.log('=== Fiscal Use Case Migration ===\n');

// Step 1: Create directories
const dirs = [
  `${FISCAL_APP}/commands/fiscal`,
  `${FISCAL_APP}/commands/cte`,
  `${FISCAL_APP}/commands/sped`,
  `${FISCAL_APP}/queries/fiscal`,
  `${FISCAL_APP}/queries/cte`,
  `${FISCAL_APP}/queries/tax-reform`,
];

for (const dir of dirs) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir, { recursive: true });
    console.log(`Created: ${dir}`);
  }
}

// Step 2: Move command files
let moved = 0;

function moveFile(name, fromDir, toDir) {
  const src = path.join(ROOT, fromDir, `${name}.ts`);
  const dest = path.join(ROOT, toDir, `${name}.ts`);
  
  if (!fs.existsSync(src)) {
    console.log(`  SKIP (not found): ${fromDir}/${name}.ts`);
    return false;
  }
  
  if (fs.existsSync(dest)) {
    console.log(`  SKIP (exists): ${toDir}/${name}.ts`);
    return false;
  }
  
  try {
    execSync(`git mv "${src}" "${dest}"`, { cwd: ROOT, stdio: 'pipe' });
    console.log(`  MOVED: ${name}.ts → ${toDir}`);
    moved++;
    return true;
  } catch (e) {
    // If git mv fails, try regular move
    fs.renameSync(src, dest);
    console.log(`  MOVED (non-git): ${name}.ts → ${toDir}`);
    moved++;
    return true;
  }
}

// Helper to determine target subdir for commands
function getCommandDir(name) {
  if (name.includes('Cte') || name.includes('Nfe') || name.includes('Manifest') || name.includes('Download')) {
    return `${FISCAL_APP}/commands/cte`;
  }
  if (name.includes('Sped')) {
    return `${FISCAL_APP}/commands/sped`;
  }
  return `${FISCAL_APP}/commands/fiscal`;
}

// Helper to determine target subdir for queries
function getQueryDir(name) {
  if (name.includes('Cte')) {
    return `${FISCAL_APP}/queries/cte`;
  }
  if (name.includes('Ibs') || name.includes('Simulate') || name.includes('Compare') || name.includes('TaxRate') || name.includes('Compensation')) {
    return `${FISCAL_APP}/queries/tax-reform`;
  }
  return `${FISCAL_APP}/queries/fiscal`;
}

console.log('\n--- Moving Commands ---');
for (const name of COMMANDS) {
  const targetDir = getCommandDir(name);
  moveFile(name, `${FISCAL_APP}/use-cases`, targetDir);
}

console.log('\n--- Moving Queries ---');
for (const name of QUERIES) {
  const targetDir = getQueryDir(name);
  moveFile(name, `${FISCAL_APP}/use-cases`, targetDir);
}

// Move SPED V2 commands
console.log('\n--- Moving SPED V2 Commands ---');
for (const name of SPED_COMMANDS) {
  moveFile(name, `${FISCAL_APP}/use-cases/sped`, `${FISCAL_APP}/commands/sped`);
}

// Move sped/index.ts  
const spedIndexSrc = path.join(ROOT, `${FISCAL_APP}/use-cases/sped/index.ts`);
const spedIndexDest = path.join(ROOT, `${FISCAL_APP}/commands/sped/index.ts`);
if (fs.existsSync(spedIndexSrc) && !fs.existsSync(spedIndexDest)) {
  try {
    execSync(`git mv "${spedIndexSrc}" "${spedIndexDest}"`, { cwd: ROOT, stdio: 'pipe' });
    console.log('  MOVED: sped/index.ts → commands/sped/');
  } catch { /* ignore */ }
}

// Move BaseUseCase to commands/
moveFile('BaseUseCase', `${FISCAL_APP}/use-cases`, `${FISCAL_APP}/commands/fiscal`);

// Move legacy SPED use cases to commands/sped/ (deprecated)
console.log('\n--- Moving Legacy SPED to commands/sped ---');
for (const name of LEGACY_SPED) {
  const src = path.join(ROOT, `${FISCAL_APP}/use-cases`, `${name}.ts`);
  if (fs.existsSync(src)) {
    // These are the OLD deprecated versions (not V2)
    // Rename to avoid conflicts with the sped/ subdirectory versions
    const destName = `${name}Legacy`;
    const dest = path.join(ROOT, `${FISCAL_APP}/commands/sped`, `${destName}.ts`);
    if (!fs.existsSync(dest)) {
      // Read content and update class name reference
      let content = fs.readFileSync(src, 'utf-8');
      fs.writeFileSync(dest, content);
      fs.unlinkSync(src);
      console.log(`  MOVED (renamed): ${name}.ts → commands/sped/${destName}.ts`);
      moved++;
    }
  }
}

// Step 3: Create barrel exports in commands/ and queries/
console.log('\n--- Creating barrel exports ---');

// Commands barrel
function createBarrel(dir, files) {
  const fullDir = path.join(ROOT, dir);
  const indexPath = path.join(fullDir, 'index.ts');
  
  // Check which files actually exist
  const existingFiles = files.filter(f => {
    const fPath = path.join(fullDir, `${f}.ts`);
    return fs.existsSync(fPath);
  });
  
  if (existingFiles.length === 0) return;
  
  const exports = existingFiles.map(f => `export { ${f} } from './${f}';`).join('\n');
  fs.writeFileSync(indexPath, `/**\n * Barrel exports\n */\n${exports}\n`);
  console.log(`  Created: ${dir}/index.ts (${existingFiles.length} exports)`);
}

createBarrel(`${FISCAL_APP}/commands/fiscal`, [...COMMANDS.filter(c => getCommandDir(c).endsWith('/fiscal')), 'BaseUseCase']);
createBarrel(`${FISCAL_APP}/commands/cte`, COMMANDS.filter(c => getCommandDir(c).endsWith('/cte')));
createBarrel(`${FISCAL_APP}/queries/fiscal`, QUERIES.filter(q => getQueryDir(q).endsWith('/fiscal')));
createBarrel(`${FISCAL_APP}/queries/cte`, QUERIES.filter(q => getQueryDir(q).endsWith('/cte')));
createBarrel(`${FISCAL_APP}/queries/tax-reform`, QUERIES.filter(q => getQueryDir(q).endsWith('/tax-reform')));

// Create main commands/index.ts and queries/index.ts
const commandsIndex = `/**
 * Fiscal Module - Commands (state-modifying use cases)
 * E16.1: Standardized from use-cases/ to commands/queries structure
 */
export * from './fiscal';
export * from './cte';
export * from './sped';
`;
fs.writeFileSync(path.join(ROOT, `${FISCAL_APP}/commands/index.ts`), commandsIndex);

const queriesIndex = `/**
 * Fiscal Module - Queries (read-only use cases)
 * E16.1: Standardized from use-cases/ to commands/queries structure
 */
export * from './fiscal';
export * from './cte';
export * from './tax-reform';
`;
fs.writeFileSync(path.join(ROOT, `${FISCAL_APP}/queries/index.ts`), queriesIndex);

// Step 4: Create backward-compatible use-cases/index.ts
console.log('\n--- Creating backward-compatible use-cases/index.ts ---');

const backCompatExports = [];
for (const name of [...COMMANDS, ...QUERIES]) {
  let targetDir;
  if (COMMANDS.includes(name)) {
    targetDir = getCommandDir(name).replace(`${FISCAL_APP}/`, '../');
  } else {
    targetDir = getQueryDir(name).replace(`${FISCAL_APP}/`, '../');
  }
  // Convert to relative from use-cases/
  const relDir = targetDir.replace('../', '../');
  backCompatExports.push(`export { ${name} } from '${relDir}/${name}';`);
}

const backCompatIndex = `/**
 * @deprecated Import from commands/ or queries/ instead
 * Backward compatibility re-exports for E16.1 migration
 */
${backCompatExports.join('\n')}
`;

const useCasesIndexPath = path.join(ROOT, `${FISCAL_APP}/use-cases/index.ts`);
fs.writeFileSync(useCasesIndexPath, backCompatIndex);
console.log('  Updated: use-cases/index.ts (backward-compatible re-exports)');

// Step 5: Update imports in consumers
console.log('\n--- Updating imports in consumers ---');

function updateImports(dir) {
  const files = execSync(`find ${dir} -name "*.ts" -not -path "*/node_modules/*"`, { cwd: ROOT, encoding: 'utf-8' })
    .trim().split('\n').filter(Boolean);
  
  let updated = 0;
  
  for (const file of files) {
    const filePath = path.join(ROOT, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;
    
    // Update imports from use-cases/ to commands/ or queries/
    for (const name of COMMANDS) {
      const oldImport = `@/modules/fiscal/application/use-cases/${name}`;
      const targetSubDir = getCommandDir(name).replace(`${FISCAL_APP}/`, '');
      const newImport = `@/modules/fiscal/application/${targetSubDir}/${name}`;
      
      if (content.includes(oldImport)) {
        content = content.replaceAll(oldImport, newImport);
        changed = true;
      }
    }
    
    for (const name of QUERIES) {
      const oldImport = `@/modules/fiscal/application/use-cases/${name}`;
      const targetSubDir = getQueryDir(name).replace(`${FISCAL_APP}/`, '');
      const newImport = `@/modules/fiscal/application/${targetSubDir}/${name}`;
      
      if (content.includes(oldImport)) {
        content = content.replaceAll(oldImport, newImport);
        changed = true;
      }
    }
    
    // Update SPED V2 imports
    for (const name of SPED_COMMANDS) {
      const oldImport = `use-cases/sped/${name}`;
      const newImport = `commands/sped/${name}`;
      
      if (content.includes(oldImport)) {
        content = content.replaceAll(oldImport, newImport);
        changed = true;
      }
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content);
      updated++;
      console.log(`  Updated: ${file}`);
    }
  }
  
  return updated;
}

const updatedCount = updateImports('src') + updateImports('tests');
console.log(`\nTotal files updated: ${updatedCount}`);

// Step 6: Update internal use-case cross-references
console.log('\n--- Updating internal cross-references ---');

// Update files that reference BaseUseCase within the moved files
function updateInternalRefs() {
  const allDirs = [
    `${FISCAL_APP}/commands/fiscal`,
    `${FISCAL_APP}/commands/cte`,
    `${FISCAL_APP}/commands/sped`,
    `${FISCAL_APP}/queries/fiscal`,
    `${FISCAL_APP}/queries/cte`,
    `${FISCAL_APP}/queries/tax-reform`,
  ];
  
  let updated = 0;
  
  for (const dir of allDirs) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
    
    for (const file of files) {
      const filePath = path.join(fullDir, file);
      let content = fs.readFileSync(filePath, 'utf-8');
      let changed = false;
      
      // Fix relative imports within moved files
      // e.g., from './BaseUseCase' needs to point to correct location
      for (const name of [...COMMANDS, ...QUERIES, 'BaseUseCase']) {
        const relImport = `./${name}`;
        
        if (content.includes(`from '${relImport}'`) || content.includes(`from "${relImport}"`)) {
          // Check if the file is in the same directory
          const sameDir = fs.existsSync(path.join(fullDir, `${name}.ts`));
          if (!sameDir) {
            // Need to find where the file actually is
            let targetPath = null;
            for (const searchDir of allDirs) {
              if (fs.existsSync(path.join(ROOT, searchDir, `${name}.ts`))) {
                // Calculate relative path
                const fromDir = path.resolve(ROOT, dir);
                const toFile = path.resolve(ROOT, searchDir, name);
                targetPath = path.relative(fromDir, toFile);
                if (!targetPath.startsWith('.')) targetPath = './' + targetPath;
                break;
              }
            }
            
            if (targetPath) {
              content = content.replaceAll(`from '${relImport}'`, `from '${targetPath}'`);
              content = content.replaceAll(`from "${relImport}"`, `from '${targetPath}'`);
              changed = true;
            }
          }
        }
      }
      
      if (changed) {
        fs.writeFileSync(filePath, content);
        updated++;
        console.log(`  Fixed internal ref: ${dir}/${file}`);
      }
    }
  }
  
  return updated;
}

updateInternalRefs();

// Clean up empty sped/ directory
const spedDir = path.join(ROOT, `${FISCAL_APP}/use-cases/sped`);
if (fs.existsSync(spedDir)) {
  const remaining = fs.readdirSync(spedDir);
  if (remaining.length === 0) {
    fs.rmdirSync(spedDir);
    console.log('\n  Cleaned up: empty use-cases/sped/ directory');
  } else {
    console.log(`\n  NOTE: use-cases/sped/ still has files: ${remaining.join(', ')}`);
  }
}

console.log(`\n=== Migration Complete ===`);
console.log(`Files moved: ${moved}`);
console.log(`Import paths updated: ${updatedCount}`);
