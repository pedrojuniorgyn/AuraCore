#!/usr/bin/env node
/**
 * Fix application-level imports in moved fiscal files
 * ../dtos/ and ../services/ need to become ../../dtos/ and ../../services/
 * since files moved from use-cases/ (1 deep) to commands/X/ or queries/X/ (2 deep)
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const FISCAL_APP = 'src/modules/fiscal/application';

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
    
    // Fix: ../dtos/ → ../../dtos/ (moved one level deeper)
    if (content.includes("from '../dtos/")) {
      content = content.replaceAll("from '../dtos/", "from '../../dtos/");
      changed = true;
    }
    if (content.includes('from "../dtos/')) {
      content = content.replaceAll('from "../dtos/', 'from "../../dtos/');
      changed = true;
    }
    
    // Fix: ../services/ → ../../services/ (moved one level deeper)
    if (content.includes("from '../services/")) {
      content = content.replaceAll("from '../services/", "from '../../services/");
      changed = true;
    }
    if (content.includes('from "../services/')) {
      content = content.replaceAll('from "../services/', 'from "../../services/');
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content);
      totalFixed++;
      console.log(`Fixed: ${dir}/${file}`);
    }
  }
}

console.log(`\nTotal files fixed: ${totalFixed}`);
