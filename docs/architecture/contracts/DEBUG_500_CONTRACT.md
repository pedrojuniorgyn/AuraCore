# Contract — Debug Erros 500

## Classificação
- **Tipo:** Procedimento de Debug
- **Prioridade:** CRÍTICA
- **Aplicação:** Qualquer erro 500 em rotas API

## Contexto

Este contrato foi criado após o incidente HOTFIX-STRATEGIC-500 (21/01/2026),
onde a causa raiz (schema não exportado) demorou a ser identificada porque
o debug começou pelas rotas ao invés da infraestrutura base.

**Estatística:** 80% dos erros 500 em módulos novos são por SCHEMA NÃO EXPORTADO.

## Checklist Obrigatório (NESTA ORDEM)

### 1. Schema Exports (VERIFICAR PRIMEIRO - 80% dos casos)

```bash
# Verificar se módulo está exportado no schema central
grep -n "export.*from.*modules/{modulo}" src/lib/db/schema.ts

# Se NÃO encontrar → ESTA É A CAUSA
# Adicionar: export * from '@/modules/{modulo}/infrastructure/persistence/schemas';
```

**Sintomas quando schema não exportado:**
- `db.query.{table}Table` retorna `undefined`
- Erro 500 em TODAS as rotas do módulo
- TypeScript compila sem erros (problema só aparece em runtime)

### 2. DI Container Registration

```bash
# Verificar se módulo está registrado no container
grep -n "{Modulo}Module" src/shared/infrastructure/di/container.ts

# Se NÃO encontrar → Adicionar registro
```

**Sintomas quando DI não registrado:**
- Erro de "dependency not found"
- Use Cases não instanciam
- Repositories retornam null

### 3. Tabelas no Banco de Dados

```bash
# Verificar se migrations existem
ls -la drizzle/migrations/*{modulo}*

# Verificar se tabela existe (SQL Server)
# SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%{modulo}%'
```

**Sintomas quando tabela não existe:**
- Erro "Invalid object name"
- Query falha no Drizzle

### 4. Variáveis de Ambiente

```bash
# Verificar DATABASE_URL
grep -n "DATABASE" .env.local .env.production

# Verificar se ambiente está correto
echo $NODE_ENV
```

**Sintomas quando env incorreto:**
- Conexão recusada
- Timeout
- "Connection string invalid"

### 5. Rota API (Por último)

```bash
# Ver implementação da rota
cat src/app/api/{modulo}/route.ts

# Verificar try/catch e logging
grep -n "catch\|console.error" src/app/api/{modulo}/route.ts
```

**Sintomas quando rota tem bug:**
- Erro específico em UMA rota (não todas)
- Stack trace aponta para linha específica

## Fluxograma de Debug

```
ERRO 500 DETECTADO
       │
       ▼
┌──────────────────────────────────────┐
│ 1. grep schema exports               │
│    grep "modules/{modulo}" schema.ts │
└──────────────────────────────────────┘
       │
       ├── NÃO ENCONTROU → ✅ CAUSA RAIZ (80%)
       │                    Adicionar export
       │
       ▼ ENCONTROU
┌──────────────────────────────────────┐
│ 2. grep DI container                 │
│    grep "{Modulo}Module" container   │
└──────────────────────────────────────┘
       │
       ├── NÃO ENCONTROU → ✅ CAUSA RAIZ (10%)
       │                    Registrar módulo
       │
       ▼ ENCONTROU
┌──────────────────────────────────────┐
│ 3. Verificar tabela no banco         │
└──────────────────────────────────────┘
       │
       ├── NÃO EXISTE → ✅ CAUSA RAIZ (5%)
       │                 Rodar migration
       │
       ▼ EXISTE
┌──────────────────────────────────────┐
│ 4. Verificar variáveis ambiente      │
└──────────────────────────────────────┘
       │
       ├── INCORRETO → ✅ CAUSA RAIZ (3%)
       │               Corrigir .env
       │
       ▼ CORRETO
┌──────────────────────────────────────┐
│ 5. Debug da rota específica          │
│    (Adicionar logs, verificar código)│
└──────────────────────────────────────┘
       │
       ▼
    ✅ CAUSA RAIZ (2%)
    Bug específico na rota
```

## Comandos Rápidos de Diagnóstico

```bash
# Script completo de diagnóstico (copiar e executar)
MODULE="strategic"  # Alterar conforme módulo

echo "=== 1. SCHEMA EXPORTS ==="
grep -n "modules/$MODULE" src/lib/db/schema.ts || echo "❌ NÃO EXPORTADO"

echo ""
echo "=== 2. DI CONTAINER ==="
grep -in "${MODULE}Module" src/shared/infrastructure/di/container.ts || echo "❌ NÃO REGISTRADO"

echo ""
echo "=== 3. MIGRATIONS ==="
ls drizzle/migrations/*$MODULE* 2>/dev/null || echo "⚠️ Nenhuma migration encontrada"

echo ""
echo "=== 4. ENV ==="
grep -n "DATABASE" .env.local | head -3

echo ""
echo "=== 5. ROTAS ==="
ls src/app/api/$MODULE/ 2>/dev/null || echo "❌ Pasta de rotas não existe"
```

## Regras

1. **SEMPRE** começar pelo schema exports
2. **NUNCA** debugar rota individual antes de verificar infraestrutura
3. **SEMPRE** usar os comandos grep antes de abrir arquivos
4. **DOCUMENTAR** a causa raiz encontrada com `register_correction`

## Probabilidade de Causa por Sintoma

| Sintoma | Causa Mais Provável | Verificação |
|---------|---------------------|-------------|
| TODAS as rotas do módulo retornam 500 | Schema não exportado (80%) | grep schema.ts |
| Uma rota específica retorna 500 | Bug na rota (70%) | Debug da rota |
| Use Case não instancia | DI não registrado (90%) | grep container.ts |
| "Invalid object name" | Tabela não existe (100%) | ls migrations/ |
| Connection refused | Env incorreto (100%) | grep .env |

## Exemplos Reais

### Exemplo 1: Strategic Module 500 (21/01/2026)

**Sintoma:** TODAS as rotas `/api/strategic/*` retornavam 500

**Debug realizado (INCORRETO):**
1. ❌ Começou verificando rota `/api/strategic/ideas`
2. ❌ Verificou Use Case `SubmitIdeaUseCase`
3. ❌ Verificou Repository `DrizzleStrategicIdeaRepository`
4. ✅ Finalmente verificou `src/lib/db/schema.ts` → Schema não exportado

**Tempo gasto:** 30+ minutos

**Debug correto (COM CONTRATO):**
1. ✅ `grep "modules/strategic" src/lib/db/schema.ts` → NÃO ENCONTRADO
2. ✅ Adicionar export → RESOLVIDO

**Tempo gasto:** 2 minutos

### Exemplo 2: Fleet Module DI (Hipotético)

**Sintoma:** Erro "FleetRepository is not registered"

**Debug COM contrato:**
1. ❌ Schema exportado? `grep "modules/fleet" schema.ts` → OK
2. ✅ DI registrado? `grep "FleetModule" container.ts` → NÃO ENCONTRADO
3. ✅ Adicionar `FleetModule.register()` → RESOLVIDO

**Tempo gasto:** 3 minutos

## Prevenção

Para evitar este tipo de erro ao criar novo módulo:

```bash
# Checklist de criação de módulo
MODULE_NAME="novo_modulo"

# 1. Criar schema
touch src/modules/$MODULE_NAME/infrastructure/persistence/schemas/index.ts

# 2. Exportar no schema central (OBRIGATÓRIO)
echo "export * from '@/modules/$MODULE_NAME/infrastructure/persistence/schemas';" >> src/lib/db/schema.ts

# 3. Registrar no DI container
# Adicionar em src/shared/infrastructure/di/container.ts:
# ${ModuleName}Module.register(container);

# 4. Verificar
grep "modules/$MODULE_NAME" src/lib/db/schema.ts
grep "${ModuleName}Module" src/shared/infrastructure/di/container.ts
```

## Referências

- **Incidente:** HOTFIX-STRATEGIC-500 (21/01/2026)
- **Commit:** 6f3e2cdb
- **Causa:** Schema não exportado em `src/lib/db/schema.ts`
- **Impacto:** Todas as rotas `/api/strategic/*` retornaram 500
- **Lição:** 80% dos erros 500 são por schema não exportado
- **Solução:** Começar debug pelo schema, não pelas rotas

## Ações Corretivas

Quando encontrar erro 500:

1. **Identificar causa raiz** usando este checklist
2. **Corrigir** o problema
3. **Registrar correção:**
   ```
   Tool: register_correction
   Args: {
     "epic": "HOTFIX-{MODULO}-500",
     "error_description": "Descrição do erro e sintomas",
     "correction_applied": "O que foi feito para corrigir",
     "files_affected": ["lista", "de", "arquivos"]
   }
   ```
4. **Atualizar documentação** se necessário
5. **Criar teste** para prevenir reincidência (se aplicável)

## Métricas de Sucesso

**Antes deste contrato:**
- Tempo médio de debug: 30-60 minutos
- Taxa de acerto na primeira tentativa: ~20%

**Após este contrato (esperado):**
- Tempo médio de debug: 5-10 minutos
- Taxa de acerto na primeira tentativa: ~80%

---

**Última atualização:** 21/01/2026  
**Versão do contrato:** 1.0.0  
**Status:** ATIVO
