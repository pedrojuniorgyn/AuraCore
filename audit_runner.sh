#!/bin/bash
# Script de Auditoria Automatizada AuraCore
# Data: 2026-01-25

mkdir -p docs/audit
OUTPUT="docs/audit/audit_raw_data.txt"

echo "=== INICIO AUDITORIA ===" > $OUTPUT
date >> $OUTPUT

echo "" >> $OUTPUT
echo "--- FASE 1: ARQUITETURA ---" >> $OUTPUT
echo "1.1 Estrutura de Pastas:" >> $OUTPUT
find src/modules -type d -name "domain" -o -name "application" -o -name "infrastructure" | sort >> $OUTPUT

echo "1.2 Contagem de Arquivos:" >> $OUTPUT
echo "Domain:" >> $OUTPUT
find src/modules/*/domain -type f | wc -l >> $OUTPUT
echo "Application:" >> $OUTPUT
find src/modules/*/application -type f | wc -l >> $OUTPUT
echo "Infrastructure:" >> $OUTPUT
find src/modules/*/infrastructure -type f | wc -l >> $OUTPUT

echo "1.3 Imports Ilegais em Domain (Infra/App):" >> $OUTPUT
grep -r "from '@/.*infrastructure" src/modules/*/domain/ >> $OUTPUT
grep -r "from '@/.*application" src/modules/*/domain/ >> $OUTPUT

echo "1.4 Imports Externos em Domain:" >> $OUTPUT
grep -r "from 'drizzle-orm'" src/modules/*/domain/ >> $OUTPUT
grep -r "from 'axios'" src/modules/*/domain/ >> $OUTPUT
grep -r "from 'zod'" src/modules/*/domain/ >> $OUTPUT

echo "1.5 Console.log em Domain:" >> $OUTPUT
grep -r "console\." src/modules/*/domain/ --exclude-dir=__tests__ >> $OUTPUT

echo "1.6 DDD Patterns (Entities/VOs):" >> $OUTPUT
echo "Total Entities:" >> $OUTPUT
find src/modules/*/domain/entities -name "*.ts" | wc -l >> $OUTPUT
echo "Entities sem create():" >> $OUTPUT
for file in $(find src/modules/*/domain/entities -name "*.ts"); do
  if ! grep -q "static create(" "$file"; then
    echo "❌ Missing create(): $file" >> $OUTPUT
  fi
done
echo "Entities sem reconstitute():" >> $OUTPUT
for file in $(find src/modules/*/domain/entities -name "*.ts"); do
  if ! grep -q "static reconstitute(" "$file"; then
    echo "❌ Missing reconstitute(): $file" >> $OUTPUT
  fi
done

echo "" >> $OUTPUT
echo "--- FASE 2: QUALIDADE DE CODIGO ---" >> $OUTPUT
echo "2.1 TypeScript Errors (Resumo):" >> $OUTPUT
# Executando tsc apenas para contagem, ignorando output detalhado para economizar espaço
npx tsc --noEmit > /tmp/tsc_out.txt 2>&1
grep "error TS" /tmp/tsc_out.txt | wc -l >> $OUTPUT

echo "2.2 Any Usage:" >> $OUTPUT
grep -r ": any" src/ --include="*.ts" --exclude-dir=node_modules | wc -l >> $OUTPUT
grep -r "as any" src/ --include="*.ts" | wc -l >> $OUTPUT

echo "2.3 Anti-Patterns (throw, ==, TODO):" >> $OUTPUT
echo "Throw em Domain:" >> $OUTPUT
grep -r "throw new Error" src/modules/*/domain/entities/ | wc -l >> $OUTPUT
echo "Uso de ==:" >> $OUTPUT
grep -r " == " src/ --include="*.ts" | grep -v "===" | wc -l >> $OUTPUT
echo "TODOs:" >> $OUTPUT
grep -r "TODO" src/ --include="*.ts" | wc -l >> $OUTPUT

echo "2.4 Test Coverage (Arquivos):" >> $OUTPUT
echo "Test Files:" >> $OUTPUT
find src -name "*.test.ts" -o -name "*.spec.ts" | wc -l >> $OUTPUT
echo "Source Files:" >> $OUTPUT
find src -name "*.ts" ! -name "*.test.ts" ! -name "*.spec.ts" | wc -l >> $OUTPUT

echo "" >> $OUTPUT
echo "--- FASE 3: DATABASE ---" >> $OUTPUT
echo "3.1 Schemas sem Tenant Columns:" >> $OUTPUT
for file in $(find src -name "*.schema.ts"); do
  TABLE=$(basename "$file" .schema.ts)
  if ! grep -q "branchId" "$file"; then
    echo "❌ Missing branchId: $TABLE ($file)" >> $OUTPUT
  fi
  if ! grep -q "organizationId" "$file"; then
    echo "❌ Missing organizationId: $TABLE ($file)" >> $OUTPUT
  fi
done

echo "3.2 Indices Compostos:" >> $OUTPUT
grep -r "index.*organizationId.*branchId" src --include="*.schema.ts" | wc -l >> $OUTPUT

echo "3.3 Repositories sem Filtro de Tenant:" >> $OUTPUT
for file in $(find src -name "*Repository.ts" -path "*/infrastructure/*"); do
  if ! grep -q "organizationId" "$file"; then
    echo "⚠️ No organizationId filter: $file" >> $OUTPUT
  fi
done

echo "" >> $OUTPUT
echo "--- FASE 4: API & SECURITY ---" >> $OUTPUT
echo "4.1 Rotas sem Zod:" >> $OUTPUT
# Listar rotas que NÃO tem z.object
for file in $(find src/app/api -name "route.ts"); do
  if ! grep -q "z\.object" "$file"; then
     echo "⚠️ No Zod: $file" >> $OUTPUT
  fi
done

echo "4.2 Hardcoded Secrets:" >> $OUTPUT
grep -ri "password.*=.*['\"]" src --include="*.ts" | grep -v "password:" >> $OUTPUT
grep -ri "api.*key.*=.*['\"]" src --include="*.ts" >> $OUTPUT

echo "" >> $OUTPUT
echo "--- FASE 5: COMPLIANCE FISCAL ---" >> $OUTPUT
echo "5.1 Blocos SPED:" >> $OUTPUT
grep -r "Bloco 0:" src/modules/fiscal >> $OUTPUT
grep -r "Bloco C:" src/modules/fiscal >> $OUTPUT

echo "5.2 Reforma Tributaria:" >> $OUTPUT
grep -ri "IBS\|CBS" src/modules/fiscal >> $OUTPUT

echo "" >> $OUTPUT
echo "--- FASE 6: PERFORMANCE ---" >> $OUTPUT
echo "6.1 Loops em Repositories (Risco N+1):" >> $OUTPUT
grep -A5 "for.*of\|forEach" src --include="*Repository.ts" | grep -i "findby\|query\|select" >> $OUTPUT

echo "" >> $OUTPUT
echo "--- FASE 7: DOCUMENTACAO ---" >> $OUTPUT
echo "7.1 ADRs:" >> $OUTPUT
find . -name "ADR-*.md" -o -name "adr-*.md" | wc -l >> $OUTPUT
echo "7.2 READMEs em Modulos:" >> $OUTPUT
find src/modules -name "README.md" | wc -l >> $OUTPUT

echo "=== FIM AUDITORIA ===" >> $OUTPUT
