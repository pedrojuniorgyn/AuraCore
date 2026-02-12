#!/usr/bin/env node
/**
 * Fix relative imports in moved fiscal use case files
 * 
 * After moving files from use-cases/ to commands/X/ or queries/X/,
 * relative imports like '../../domain/' need to be updated to '../../../domain/'
 * or converted to absolute imports.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const FISCAL_APP = 'src/modules/fiscal/application';

// All directories that contain moved files
const DIRS = [
  `${FISCAL_APP}/commands/fiscal`,
  `${FISCAL_APP}/commands/cte`,
  `${FISCAL_APP}/commands/sped`,
  `${FISCAL_APP}/queries/fiscal`,
  `${FISCAL_APP}/queries/cte`,
  `${FISCAL_APP}/queries/tax-reform`,
];

let totalFixed = 0;

for (const dir of DIRS) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) continue;
  
  const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
  
  for (const file of files) {
    const filePath = path.join(fullDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;
    
    // Files were at fiscal/application/use-cases/ (../../ X = fiscal/X)
    // Now at fiscal/application/{commands|queries}/{sub}/ (../../X = fiscal/application/X, WRONG)
    // Need to fix: ../../domain/ → ../../../domain/
    //              ../../infrastructure/ → ../../../infrastructure/
    //              ../../application/ → ../  (for same-level refs)
    
    // Pattern 1: ../../domain/ should be ../../../domain/
    // (3 levels up from commands/cte/ to reach fiscal/)
    const replacements = [
      // domain imports (most common)
      [/from ['"]\.\.\/\.\.\/domain\//g, "from '../../../domain/"],
      // infrastructure imports
      [/from ['"]\.\.\/\.\.\/infrastructure\//g, "from '../../../infrastructure/"],
      // Cross-reference to other use-cases (now in different command/query dirs)
      // These should use absolute imports
    ];
    
    for (const [regex, replacement] of replacements) {
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        changed = true;
      }
    }
    
    // Fix shared domain imports (e.g., from '@/shared/domain' - these should be fine)
    // Fix relative imports to BaseUseCase or other use-cases
    // from './BaseUseCase' → from '../fiscal/BaseUseCase' (for non-fiscal dirs)
    
    // For files in commands/cte/ that import from '../use-cases/BaseUseCase'
    if (content.includes("from '../use-cases/BaseUseCase'") || content.includes('from "../use-cases/BaseUseCase"')) {
      content = content.replace(
        /from ['"]\.\.\/use-cases\/BaseUseCase['"]/g,
        "from '../fiscal/BaseUseCase'"
      );
      changed = true;
    }
    
    // For files in commands/cte that import from './DownloadNfesUseCase' (within same dir, should be fine)
    
    if (changed) {
      fs.writeFileSync(filePath, content);
      totalFixed++;
      console.log(`Fixed: ${dir}/${file}`);
    }
  }
}

// Also fix files in commands/sped that import from the fiscal module root
// These were at use-cases/sped/ so they used '../../../domain/' (correct for 3 levels)
// Now at commands/sped/ still 3 levels, so should be fine

console.log(`\nTotal files fixed: ${totalFixed}`);
