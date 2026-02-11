#!/usr/bin/env node
/**
 * Script para converter TODOs do código em GitHub Issues
 * E17.2: Converter ~120 TODOs para GitHub Issues
 * 
 * Uso: node scripts/convert-todos-to-issues.mjs [--dry-run] [--limit N]
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.indexOf('--limit');
const LIMIT = LIMIT_ARG !== -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) : Infinity;

// Labels por módulo
const MODULE_LABELS = {
  fiscal: 'module:fiscal',
  financial: 'module:financial',
  strategic: 'module:strategic',
  tms: 'module:tms',
  wms: 'module:wms',
  integrations: 'module:integrations',
  shared: 'module:shared',
  agent: 'module:agent',
  services: 'tech-debt',
  app: 'module:api',
  hooks: 'module:frontend',
  lib: 'module:lib',
  components: 'module:frontend',
};

// Prioridade por tipo de TODO
const PRIORITY_LABELS = {
  'E10': 'priority:medium',
  'SEFAZ': 'priority:high',
  'PROD': 'priority:high',
  'Implementar': 'priority:low',
};

function getModuleFromPath(filePath) {
  // src/modules/{module}/...
  const moduleMatch = filePath.match(/src\/modules\/(\w+)\//);
  if (moduleMatch) return moduleMatch[1];

  // src/services/...
  if (filePath.startsWith('src/services/')) return 'services';
  // src/app/api/...
  if (filePath.startsWith('src/app/')) return 'app';
  // src/hooks/...
  if (filePath.startsWith('src/hooks/')) return 'hooks';
  // src/lib/...
  if (filePath.startsWith('src/lib/')) return 'lib';
  // src/components/...
  if (filePath.startsWith('src/components/')) return 'components';
  // src/agent/...
  if (filePath.startsWith('src/agent/')) return 'agent';
  // src/shared/...
  if (filePath.startsWith('src/shared/')) return 'shared';
  
  return 'other';
}

function getLabelForModule(module) {
  return MODULE_LABELS[module] || 'tech-debt';
}

function getPriorityLabel(todoText) {
  for (const [keyword, label] of Object.entries(PRIORITY_LABELS)) {
    if (todoText.includes(keyword)) return label;
  }
  return 'priority:low';
}

function extractTodos() {
  const raw = execSync(
    `rg -n 'TODO[^S]' --type ts --glob '!node_modules/**' --glob '!.next/**' --glob '!mcp-server/**' --glob '!tests/**' --glob '!scripts/**' src/`,
    { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
  );

  const lines = raw.trim().split('\n').filter(Boolean);
  const todos = [];

  for (const line of lines) {
    const match = line.match(/^(.+?):(\d+):\s*(.+)$/);
    if (!match) continue;

    const [, filePath, lineNum, content] = match;
    const todoMatch = content.match(/TODO[:\s-]*(.+?)(?:\s*\*\/)?$/);
    if (!todoMatch) continue;

    const todoText = todoMatch[1].trim();
    if (!todoText || todoText.length < 5) continue; // Skip very short TODOs

    todos.push({
      file: filePath,
      line: parseInt(lineNum, 10),
      text: todoText,
      module: getModuleFromPath(filePath),
    });
  }

  return todos;
}

function groupTodosByTheme(todos) {
  const groups = new Map();

  for (const todo of todos) {
    // Create a grouping key based on module + similar text
    const key = `${todo.module}::${normalizeText(todo.text)}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        module: todo.module,
        text: todo.text,
        files: [],
      });
    }
    
    groups.get(key).files.push({ file: todo.file, line: todo.line, text: todo.text });
  }

  return Array.from(groups.values());
}

function normalizeText(text) {
  // Normalize similar TODOs into groups
  return text
    .toLowerCase()
    .replace(/\(.+?\)/g, '') // Remove (E10), (INFRA-005), etc.
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50);
}

function createIssueTitle(group) {
  const moduleLabel = group.module.charAt(0).toUpperCase() + group.module.slice(1);
  let text = group.text;
  
  // Limpar texto para título
  if (text.length > 80) {
    text = text.substring(0, 77) + '...';
  }
  
  return `[TODO][${moduleLabel}] ${text}`;
}

function createIssueBody(group) {
  const fileList = group.files
    .map(f => `- \`${f.file}:${f.line}\`: ${f.text}`)
    .join('\n');

  return `## TODO encontrado no código

**Módulo:** ${group.module}
**Arquivos afetados:** ${group.files.length}

### Localizações

${fileList}

### Contexto

Este TODO foi extraído automaticamente do código-fonte durante o sprint E17.2.

### Ação necessária

Implementar a funcionalidade descrita ou remover o TODO se já foi resolvido.

---
_Gerado automaticamente por \`scripts/convert-todos-to-issues.mjs\`_`;
}

async function ensureLabelsExist() {
  const labels = [
    ...new Set(Object.values(MODULE_LABELS)),
    ...new Set(Object.values(PRIORITY_LABELS)),
    'todo',
  ];

  for (const label of labels) {
    try {
      execSync(`gh label create "${label}" --color "fbca04" --description "Auto-generated label" 2>/dev/null`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      console.log(`  ✅ Label criado: ${label}`);
    } catch {
      // Label already exists
    }
  }
}

function createIssue(title, body, labels) {
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Criaria issue: ${title}`);
    console.log(`    Labels: ${labels.join(', ')}`);
    return;
  }

  try {
    // Write body to temp file to avoid shell escaping issues
    const tmpFile = '/tmp/gh-issue-body.md';
    writeFileSync(tmpFile, body, 'utf-8');

    const labelsFlag = labels.map(l => `--label "${l}"`).join(' ');
    const safeTitle = title.replace(/"/g, '\\"').replace(/`/g, '');
    
    const result = execSync(
      `gh issue create --title "${safeTitle}" --body-file "${tmpFile}" ${labelsFlag}`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    console.log(`  ✅ Issue criada: ${result.trim()}`);
    
    try { unlinkSync(tmpFile); } catch {}
  } catch (error) {
    console.error(`  ❌ Erro ao criar issue: ${title.substring(0, 60)}...`);
  }
}

// Main
console.log('🔍 Extraindo TODOs do código...');
const todos = extractTodos();
console.log(`   Total encontrado: ${todos.length} TODOs`);

console.log('\n📦 Agrupando por tema...');
const groups = groupTodosByTheme(todos);
console.log(`   Total de issues a criar: ${groups.length}`);

// Mostrar resumo por módulo
const moduleCount = {};
for (const g of groups) {
  moduleCount[g.module] = (moduleCount[g.module] || 0) + 1;
}
console.log('\n📊 Distribuição por módulo:');
for (const [mod, count] of Object.entries(moduleCount).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${mod}: ${count} issues`);
}

if (!DRY_RUN) {
  console.log('\n🏷️ Criando labels...');
  await ensureLabelsExist();
}

console.log(`\n🚀 Criando issues${DRY_RUN ? ' (DRY-RUN)' : ''}...`);
let created = 0;
for (const group of groups) {
  if (created >= LIMIT) {
    console.log(`\n⏸️ Limite de ${LIMIT} issues atingido.`);
    break;
  }

  const title = createIssueTitle(group);
  const body = createIssueBody(group);
  const labels = [
    'todo',
    getLabelForModule(group.module),
    getPriorityLabel(group.text),
  ].filter(Boolean);

  createIssue(title, body, labels);
  created++;
  
  // Rate limit: esperar 1s entre criações
  if (!DRY_RUN) {
    await new Promise(r => setTimeout(r, 1000));
  }
}

console.log(`\n✅ Concluído! ${created} issues ${DRY_RUN ? 'simuladas' : 'criadas'}.`);
