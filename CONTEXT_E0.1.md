# CONTEXTO E0.1 - AuraCore ERP (RECOMEÇO)

## 🎯 Objetivo do E0.1

**Meta única e clara:** Habilitar TypeCheck no build (`ignoreBuildErrors: false`)

**Escopo:** APENAS correções necessárias para build compilar

**Fora de escopo:**
- ❌ Corrigir todos os erros TypeScript (não é meta)
- ❌ Refatorar código (fora do escopo)
- ❌ Adicionar features (fora do escopo)
- ❌ Otimizar performance (fora do escopo)

---

## 📊 Situação do Projeto

### Informações Básicas
- **Nome:** AuraCore
- **Tipo:** ERP Enterprise (TMS/WMS/Fiscal/Financeiro)
- **Stack:** Next.js 15 App Router, TypeScript, Drizzle ORM, SQL Server 2022
- **Situação:** Código funcional em produção com débito técnico
- **Build atual:** Passa com `ignoreBuildErrors: true` ✅

### Arquivos Críticos do Projeto
- `.cursorrules` → Regras obrigatórias (LER SEMPRE PRIMEIRO)
- `src/lib/db/schema.ts` → Schema SQL Server (Drizzle)
- `next.config.ts` → Configuração Next.js

### Estado AtdErrors: true`
- **Erros TypeScript estimados:** ~450-470
- **Build:** Compila com sucesso (mas ignora erros)

---

## 🚨 LIÇÃO APRENDIDA (Tentativa Anterior)

### ❌ O que NÃO funcionou:
1. Habilitar TypeCheck ANTES de garantir que build passa
2. Tentar corrigir muitos arquivos de uma vez (13 arquivos)
3. Escopo explodiu (80+ arquivos modificados)
4. Trabalho em branch errada (não commitado)
5. Reversão destrutiva (`git clean -fd` sem backup)

### ✅ O que faremos DIFERENTE agora:

**Estratégia Ultra-Conservadora:**
```
REGRA DE OURO: 1-2 arquivos → Commit → Validar → Próximo

Fase 1: Análise (SEM modificar código)
├─ Identificar erros BLOQUEANTES apenas
├─ Categorizar por tipo
└─ Criar plano minimalista

Fase 2: Correção Incremental
├─ Corrigir 1-2 arquivos por vez
├─ Validar: npm run typecheck
├─ Commit imediatamente: git commit -m "..."
├─ Push: git push origin main
└─ Repetir até erros bloqueantes = 0

Fase 3: Habilitar TypeCheck
├─ Modificar neimeira tentativa ✅
├─ Commit: "feat(e0.1): habilitar TypeCheck"
└─ E0.1 CONCLUÍDO ✅
```

---

## 🎯 Estratégia de Execução

### Princípios Obrigatórios

**1. Commits Frequentes (SAGRADO)**
```bash
# A CADA 1-2 arquivos modificados:
git add .
git commit -m "feat(e0.1): corrigir [arquivo] - [breve descrição]"
git push origin main

# NUNCA trabalhar com 3+ arquivos sem commit
```

**2. Validação Constante**
```bash
# Após CADA modificação:
npm run typecheck

# Confirmar que erros diminuíram (não aumentaram)
```

**3. Escopo Minimalista**
```
Pergunte SEMPRE antes de corrigir:
- Este erro IMPEDE compilação? (bloqueante)
- Está no escopo do E0.1? (habilitar TypeCheck)
- É a correção MÍNIMA necessária? (não refatorar)

Se 3x SIM → Corrigir
Se qualquer NÃO → Pular
```

**4. Pausas Estratégicas**
```
A cada 5 arquivos corrigidos:
├─ Parar
├─ Validar progresso (typecheck)
├─ Commit + Push
├─ Relatar ao humano
└─ Aguardar aprovação para continuar

NUNCOS (NÃO TOCAR)

**5 arquivos CRÍTICOS preservados para E9 (com testes):**

| Arquivo | Razão | Multa/Risco |
|---------|-------|-------------|
| `accounting-engine.ts` | Contabilização (balanço, DRE) | Auditoria falha |
| `financial-title-generator.ts` | Títulos financeiros | Duplicidade |
| `sped-fiscal-generator.ts` | SPED obrigatório | R$ 5.000+ |
| `sped-ecd-generator.ts` | SPED contábil | R$ 5.000+ |
| `sped-contributions-generator.ts` | SPED PIS/COFINS | R$ 5.000+ |

**Se build falhar NESTES arquivos:**
- ❌ NÃO corrigir agora
- ✅ Reportar ao humano
- ✅ Deixar para E9 (com testes de proteção)

---

## 📋 Checklist de Segurança

**Antes de CADA modificação, confirmar:**

- [ ] Li .cursorrules completamente? ✅
- [ ] Entendi o objetivo do E0.1? ✅
- [ ] Erro é BLOQUEANTE (impede compilação)? ✅
- [ ] Correção é MÍNIMA (não refatora)? ✅
- [ ] Arquivo NÃO está na lista proibida? ✅
- [ ] Vou fazer commit logo após? ✅

**Se qualquer item = ❌, NÃO prosseguir**

--ise Pura (0 modificações)

**Objetivo:** Entender o que realmente BLOQUEIA build
```bash
# Executar com ignoreBuildErrors: true (estado atual)
npm run build

# Listar APENAS erros que impedem compilação
# Ignorar warnings
# Ignorar erros não-bloqueantes
```

**Entregável:** Lista de 5-10 erros BLOQUEANTES (não 470)

---

### Fase 2: Correção Minimalista (1-2 arquivos por sessão)

**Sessão 1:**
- Corrigir arquivo #1
- Validar: `npm run typecheck`
- Commit + Push
- ⏸️ PARAR e reportar

**Sessão 2:**
- Corrigir arquivo #2
- Validar: `npm run typecheck`
- Commit + Push
- ⏸️ PARAR e reportar

**Repetir até:** Erros bloqueantes = 0

---

### Fase 3: Habilitar TypeCheck (1 modificação)
```typescript
// next.config.ts
typescript: {
  ignoreBuildErrors: false, // ✅ Ativar
}
```

**Validar:**
```bash
npm run build  # DEVE passar ✅
```

**Commit:**
```bash
git add next.config.ts
git commit -m "feat(e0.1): habilitar TypeCheck - build validado"
git push origin main
```

**🎉 E0.1 CONCLUÍDO!esso

**Critérios obrigatórios:**
- [ ] `next.config.ts`: `ignoreBuildErrors: false` ✅
- [ ] `npm run build`: exit code 0 ✅
- [ ] Commits: 5-10 commits incrementais ✅
- [ ] Arquivos críticos: intocados ✅
- [ ] Tempo: 2-3 sessões (não tudo de uma vez) ✅

**Critérios opcionais (não obrigatórios):**
- [ ] Zero erros TypeScript total (não é meta)
- [ ] Código refatorado (fora do escopo)
- [ ] Testes adicionados (é meta do E9, não E0.1)

---

## 🤝 Contrato Sonnet ↔ Humano

### Sonnet se compromete a:
1. ✅ Ler .cursorrules ANTES de cada ação
2. ✅ Corrigir 1-2 arquivos por vez (MÁXIMO)
3. ✅ Fazer commit + push a cada 1-2 arquivos
4. ✅ Parar e reportar a cada 5 arquivos
5. ✅ NÃO tocar em arquivos críticos
6. ✅ NÃO sair do escopo (habilitar TypeCheck)
7. ✅ Perguntar ANTES de decisões grandes

### Humano se compromete a:
1. ✅ Validar cada entrega (não deixar acumular)
2. ✅ Aprovar continuação a cada pausa
3. ✅ Reportar problemas imediatamente
4. ✅ Não press## 🚀 Estado Atual (Ponto de Partida)

**Git:**
- Branch: `main` ✅
- Status: `clean` ✅
- Último commit: "auditoria v2 + branch scoping"

**Build:**
- `npm run build`: Passa com `ignoreBuildErrors: true` ✅
- Erros TypeScript: ~450-470 (estimado)

**Arquivos críticos:**
- `.cursorrules`: ✅ Existe (recém-recriado)
- `next.config.ts`: ✅ Existe (`ignoreBuildErrors: true`)
- Schema: ✅ Existe

**Pronto para começar:** ✅

---

**FIM DO CONTEXTO - Leia completamente antes de começar**
