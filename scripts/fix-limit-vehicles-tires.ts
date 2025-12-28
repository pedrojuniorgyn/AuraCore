/**
 * Script para corrigir erros .limit() em vehicles e tires
 * E7-TS Fase 2 BATCH 3
 */

import * as fs from 'fs';
import * as path from 'path';

const files = [
  'src/app/api/fleet/vehicles/[id]/route.ts',
  'src/app/api/fleet/tires/[id]/route.ts',
];

function fixLimitInFile(filePath: string) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  let changes = 0;

  // Padrão 1: const existing = await db...limit(1); if (existing.length === 0)
  const pattern1 = /const existing = await db\s+\.select\(\)\s+\.from\((\w+)\)\s+\.where\(\s+and\(\s+eq\(\1\.id, \w+\),\s+eq\(\1\.organizationId, ctx\.organizationId\),\s+isNull\(\1\.deletedAt\)\s+\)\s+\)\s+\.limit\(1\);\s+if \(existing\.length === 0\)/gs;
  
  content = content.replace(pattern1, (match, tableName) => {
    changes++;
    return `const existing = await queryFirst<typeof ${tableName}.$inferSelect>(\n      db\n        .select()\n        .from(${tableName})\n        .where(\n          and(\n            eq(${tableName}.id, ${tableName}Id),\n            eq(${tableName}.organizationId, ctx.organizationId),\n            isNull(${tableName}.deletedAt)\n          )\n        )\n    );\n\n    if (!existing)`;
  });

  // Padrão 2: const duplicatePlate = await db...limit(1); if (duplicatePlate.length > 0 && duplicatePlate[0].id !== vehicleId)
  const pattern2 = /const (\w+) = await db\s+\.select\(\)\s+\.from\((\w+)\)\s+\.where\(\s+and\(\s+eq\(\2\.\w+, body\.\w+\),\s+eq\(\2\.organizationId, ctx\.organizationId\),\s+isNull\(\2\.deletedAt\)\s+\)\s+\)\s+\.limit\(1\);\s+if \(\1\.length > 0 && \1\[0\]\.id !== \w+Id\)/gs;
  
  content = content.replace(pattern2, (match, varName, tableName) => {
    changes++;
    return `const ${varName} = await queryFirst<typeof ${tableName}.$inferSelect>(\n        db\n          .select()\n          .from(${tableName})\n          .where(\n            and(\n              eq(${tableName}.${varName.replace('duplicate', '').toLowerCase()}, body.${varName.replace('duplicate', '').toLowerCase()}),\n              eq(${tableName}.organizationId, ctx.organizationId),\n              isNull(${tableName}.deletedAt)\n            )\n          )\n      );\n\n      if (${varName} && ${varName}.id !== ${tableName}Id)`;
  });

  // Padrão 3: const [updated] = await db...limit(1);
  const pattern3 = /const \[updated\] = await db\s+\.select\(\)\s+\.from\((\w+)\)\s+\.where\(and\(eq\(\1\.id, \w+Id\), eq\(\1\.organizationId, ctx\.organizationId\), isNull\(\1\.deletedAt\)\)\)\s+\.limit\(1\);/gs;
  
  content = content.replace(pattern3, (match, tableName) => {
    changes++;
    return `const updated = await queryFirst<typeof ${tableName}.$inferSelect>(\n      db\n        .select()\n        .from(${tableName})\n        .where(and(eq(${tableName}.id, ${tableName}Id), eq(${tableName}.organizationId, ctx.organizationId), isNull(${tableName}.deletedAt)))\n    );`;
  });

  if (changes > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ ${filePath}: ${changes} correções aplicadas`);
  } else {
    console.log(`⚠️  ${filePath}: Nenhuma correção aplicada`);
  }

  return changes;
}

let totalChanges = 0;
for (const file of files) {
  totalChanges += fixLimitInFile(file);
}

console.log(`\n✅ Total: ${totalChanges} correções aplicadas`);

