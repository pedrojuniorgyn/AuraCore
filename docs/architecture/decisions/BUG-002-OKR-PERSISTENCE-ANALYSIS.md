# BUG-002: OKRs - Análise de Persistência

**Data:** 2026-02-04  
**Status:** 📊 ANÁLISE CONCLUÍDA  
**Decisão:** MANTER mock-store + adicionar persistência em arquivo

---

## 🔍 Diagnóstico Completo

### Problema Relatado (Incorreto)
- "Dados mock com strings como `okr-corporate-1` causam erro 500"

### Problema Real (Correto)
- **OKRs já usam UUIDs reais** (ex: `550e8400-e29b-41d4-a716-446655440000`)
- **Mock-store em memória** perde dados ao reiniciar servidor
- **Em produção**, após restart, todos os OKRs desaparecem
- **API retorna 404** (não 500) quando OKR não existe
- **Frontend mostra erro genérico** "Failed to fetch OKR"

### Arquivos Analisados
```
✅ src/lib/okrs/mock-store.ts - UUIDs reais, dados em memória
✅ src/app/api/strategic/okrs/route.ts - GET/POST funcionam
✅ src/app/api/strategic/okrs/[id]/route.ts - GET retorna 404 se não existe
✅ src/app/api/strategic/okrs/tree/route.ts - Monta árvore hierárquica
✅ src/lib/okrs/okr-service.ts - Frontend faz fetch correto
✅ src/app/(dashboard)/strategic/okrs/[id]/page.tsx - Trata erro genericamente
```

### Estrutura Atual (Correta)
```typescript
// ✅ CORRETO: UUIDs reais
const corporateId = '550e8400-e29b-41d4-a716-446655440000';
const logisticsId = '550e8400-e29b-41d4-a716-446655440001';

// ✅ CORRETO: Store em memória
export const okrsStore = new Map<string, OKR>();

// ❌ PROBLEMA: Perde dados ao reiniciar
// Solução: Persistir em arquivo JSON
```

---

## 🎯 Opções de Solução

### Opção 1: DDD Completo (IDEAL, mas LONGO)
**Tempo:** 2-3 dias  
**Escopo:**
- Criar módulo `src/modules/strategic/okr/`
- Entity + Value Objects
- Repository interface + Drizzle implementation
- Schema SQL Server
- Migrations
- DI registration
- Atualizar todas as rotas API

**Prós:**
- ✅ Solução definitiva e profissional
- ✅ Dados persistem no banco real
- ✅ Multi-tenancy correto
- ✅ Segue padrão do projeto

**Contras:**
- ❌ Muito tempo (fora do escopo de 1-2h)
- ❌ Requer design de schema
- ❌ Requer testes extensivos

---

### Opção 2: Persistência em Arquivo JSON (PRAGMÁTICA)
**Tempo:** 30-45min  
**Escopo:**
- Adicionar `fs.writeFileSync` no mock-store
- Salvar em `data/okrs.json` (gitignored)
- Carregar ao inicializar
- Manter API routes inalteradas

**Prós:**
- ✅ Rápido de implementar
- ✅ Resolve o problema imediato
- ✅ Não quebra código existente
- ✅ Fácil de testar

**Contras:**
- ⚠️ Não é multi-tenant (todos os dados em 1 arquivo)
- ⚠️ Não escala para produção real
- ⚠️ Temporário (precisa migrar para DDD depois)

---

### Opção 3: LocalStorage no Cliente (NÃO RECOMENDADA)
**Tempo:** 1h  
**Escopo:**
- Mover mock-store para cliente
- Usar localStorage/IndexedDB
- Sincronizar entre tabs

**Prós:**
- ✅ Dados persistem no browser

**Contras:**
- ❌ Dados não compartilhados entre usuários
- ❌ Perde dados ao limpar cache
- ❌ Não funciona em produção multi-user
- ❌ Quebra SSR

---

## ✅ Decisão: Opção 2 (Persistência em Arquivo)

**Justificativa:**
1. **Resolve o problema imediato** (dados não se perdem)
2. **Rápido de implementar** (30-45min vs 2-3 dias)
3. **Não quebra código existente** (API routes inalteradas)
4. **Permite testar funcionalidade** antes de investir em DDD
5. **Fácil de remover** quando migrar para DDD

**Trade-offs Aceitos:**
- ⚠️ Não é multi-tenant (OK para desenvolvimento)
- ⚠️ Não escala (OK para MVP/testes)
- ⚠️ Temporário (será substituído por DDD em épico futuro)

---

## 📝 Implementação (Opção 2)

### Arquivo: `src/lib/okrs/mock-store.ts`

```typescript
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'okrs.json');

// Garantir que diretório existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Carregar dados do arquivo ao inicializar
function loadFromFile(): Map<string, OKR> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const json = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(json);
      return new Map(Object.entries(data));
    }
  } catch (error) {
    console.error('[OKR Store] Failed to load from file:', error);
  }
  return new Map();
}

// Salvar dados no arquivo
function saveToFile(store: Map<string, OKR>): void {
  try {
    const data = Object.fromEntries(store);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[OKR Store] Failed to save to file:', error);
  }
}

// Store singleton (carrega do arquivo)
export const okrsStore = loadFromFile();

// Se vazio, inicializar com dados mock
if (okrsStore.size === 0) {
  initializeMockOkrs();
  saveToFile(okrsStore); // Salvar dados iniciais
}

// Atualizar funções para salvar após modificações
export function createOkr(okr: OKR): OKR {
  okrsStore.set(okr.id, okr);
  saveToFile(okrsStore); // ✅ Persistir
  return okr;
}

export function updateOkr(id: string, updates: Partial<OKR>): OKR | undefined {
  const existing = okrsStore.get(id);
  if (!existing) return undefined;

  const updated = { ...existing, ...updates, updatedAt: new Date() };
  okrsStore.set(id, updated);
  saveToFile(okrsStore); // ✅ Persistir
  return updated;
}

export function deleteOkr(id: string): boolean {
  const result = okrsStore.delete(id);
  if (result) saveToFile(okrsStore); // ✅ Persistir
  return result;
}
```

### Arquivo: `.gitignore`
```
# OKR mock data (temporário)
/data/okrs.json
```

---

## 🧪 Testes

```bash
# 1. Criar OKR via API
curl -X POST http://localhost:3000/api/strategic/okrs \
  -H "Content-Type: application/json" \
  -d '{"title": "Teste Persistência", "level": "corporate"}'

# 2. Verificar arquivo criado
cat data/okrs.json | jq '.[] | select(.title == "Teste Persistência")'

# 3. Reiniciar servidor
# (Ctrl+C e npm run dev novamente)

# 4. Buscar OKR criado
curl http://localhost:3000/api/strategic/okrs | jq '.okrs[] | select(.title == "Teste Persistência")'

# ✅ Esperado: OKR ainda existe após restart
```

---

## 🔄 Migração Futura (DDD)

Quando implementar DDD completo:

1. **Criar módulo** `src/modules/strategic/okr/`
2. **Migrar dados** de `data/okrs.json` para SQL Server
3. **Atualizar rotas** API para usar repository
4. **Deletar** `src/lib/okrs/mock-store.ts`
5. **Remover** `data/okrs.json`

**Script de migração:**
```sql
-- Migrar OKRs do JSON para SQL
INSERT INTO okrs (id, title, description, ...)
SELECT 
  id,
  title,
  description,
  ...
FROM OPENJSON(@json_data)
WITH (
  id VARCHAR(36),
  title NVARCHAR(200),
  ...
);
```

---

## 📊 Comparação Final

| Aspecto | Mock (Atual) | Arquivo JSON | DDD Completo |
|---------|--------------|--------------|--------------|
| **Tempo** | 0h (já existe) | 30-45min | 2-3 dias |
| **Persistência** | ❌ Memória | ✅ Arquivo | ✅ Banco SQL |
| **Multi-tenant** | ❌ Não | ❌ Não | ✅ Sim |
| **Escalabilidade** | ❌ Não | ⚠️ Limitada | ✅ Sim |
| **Produção** | ❌ Não | ⚠️ Dev only | ✅ Sim |
| **Manutenção** | ✅ Simples | ✅ Simples | ⚠️ Complexo |

---

## ✅ Conclusão

**Implementar Opção 2 (Arquivo JSON):**
- ✅ Resolve problema imediato
- ✅ Tempo compatível com escopo (30-45min)
- ✅ Não quebra código existente
- ✅ Permite testar funcionalidade
- ⚠️ Temporário (migrar para DDD em épico futuro)

**NÃO implementar DDD agora:**
- ❌ Fora do escopo de tempo (1-2h → 2-3 dias)
- ❌ Requer design de schema
- ❌ Requer épico dedicado

---

**Próximo Passo:** Implementar persistência em arquivo JSON.
