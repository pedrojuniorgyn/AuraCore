# DT-001: Schema Obsoleto fiscal_document_items

**Data de Identificação:** 07/01/2026  
**Identificado Durante:** E7.15 - Investigação de conflito net_amount vs total_value  
**Prioridade:** 🟡 MÉDIA  
**Status:** ⏳ PENDENTE

---

## 🔍 CONTEXTO

Durante a investigação de issues ping-pong no `accounting-engine.ts`, foi descoberto que existem **dois schemas conflitantes** para a mesma tabela `fiscal_document_items`:

| Schema | Localização | Campo de Valor | Status |
|--------|-------------|----------------|--------|
| **ATIVO** | `src/lib/db/schema/accounting.ts` | `netAmount` / `net_amount` | ✅ Em uso |
| **OBSOLETO** | `src/modules/fiscal/infrastructure/persistence/FiscalDocumentSchema.ts` | `totalValue` / `total_value` | ⚠️ Legado |

---

## 🚨 PROBLEMA

O schema obsoleto:
1. **Causa confusão** - Desenvolvedores podem usar o schema errado
2. **Gera issues falsas** - Detectores podem reportar inconsistências
3. **Desperdiça tempo** - Correções ping-pong como ocorreu em 07/01/2026
4. **É código morto** - Se não está sendo usado, deve ser removido

---

## 📋 ARQUIVO AFETADO

```
src/modules/fiscal/infrastructure/persistence/FiscalDocumentSchema.ts
```

---

## ✅ AÇÕES NECESSÁRIAS

### Opção A: Remover Schema Obsoleto (Recomendado se não usado)

1. **Verificar uso:**
   ```bash
   grep -rn "from.*FiscalDocumentSchema" src/ --include="*.ts"
   grep -rn "fiscalDocumentItems" src/modules/fiscal/ --include="*.ts"
   ```

2. **Se não houver uso:** Remover o arquivo ou as definições duplicadas

3. **Se houver uso:** Migrar para usar o schema ativo (`@/lib/db/schema`)

### Opção B: Alinhar Schemas (Se ambos são necessários)

1. **Atualizar** `FiscalDocumentSchema.ts` para usar `netAmount` ao invés de `totalValue`
2. **Verificar** se há migrações pendentes
3. **Testar** que o módulo fiscal continua funcionando

### Opção C: Consolidar em Schema Único

1. **Mover** todas as definições para `src/lib/db/schema/`
2. **Atualizar** imports em todos os módulos DDD
3. **Remover** schemas duplicados em módulos

---

## 📊 IMPACTO DA NÃO AÇÃO

| Risco | Probabilidade | Impacto |
|-------|---------------|---------|
| Novas issues ping-pong | Alta | Perda de tempo |
| Desenvolvedor usar schema errado | Média | Bugs em produção |
| Código morto acumulando | Alta | Dívida técnica |

---

## 🔗 REFERÊNCIAS

- **Investigação original:** E7.15, 07/01/2026
- **Lição aprendida:** LL-2026-01-07-013
- **Regras criadas:** VAT-012, VAT-013

---

## 📅 PRAZO SUGERIDO

- **Investigação de uso:** Próxima semana
- **Ação corretiva:** Antes do próximo sprint
- **Prioridade:** Após conclusão do E7.15

---

## 📝 HISTÓRICO

| Data | Ação | Responsável |
|------|------|-------------|
| 07/01/2026 | Identificação do problema | Investigação E7.15 |
| - | Verificação de uso | Pendente |
| - | Decisão (remover/alinhar) | Pendente |
| - | Implementação | Pendente |
| - | Validação | Pendente |

---

**Tags:** `débito-técnico` `schema` `ddd-migration` `fiscal` `e7.15` `prioridade-média`

