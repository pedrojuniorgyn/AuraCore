# SMP - SYSTEMATIC MIGRATION PROTOCOL

**Versão:** 1.0.0  
**Data:** 07/01/2026  
**Autor:** AuraCore Engineering Team

---

## 📋 VISÃO GERAL

O **SMP (Systematic Migration Protocol)** é a metodologia padrão do AuraCore para execução de refatorações, migrações e padronizações de código em larga escala.

### Princípios Fundamentais

1. **Infraestrutura Primeiro** - Criar helpers/utilities ANTES de refatorar
2. **Mapear Antes de Corrigir** - Conhecer 100% do escopo antes de iniciar
3. **Categorizar por Padrão** - Agrupar por tipo de correção, não por arquivo
4. **Aprovar Antes de Executar** - Plano de fases requer aprovação explícita
5. **Retroalimentar Sempre** - Cada bug vira regra para prevenir recorrência

---

## 🔄 FASES DO SMP

```
┌─────────────────────────────────────────────────────────┐
│ FASE 1: INFRAESTRUTURA (SMP-INFRA)                     │
│                                                         │
│ Criar helpers/utilities centralizados ANTES de         │
│ refatorar código existente.                            │
│                                                         │
│ Entregáveis:                                           │
│ • Helper functions em local apropriado                 │
│ • Documentação JSDoc completa                          │
│ • Testes unitários do helper                           │
│ • Export no index do módulo                            │
│                                                         │
│ Critério de Saída:                                     │
│ • Helper criado e testado                              │
│ • Commit isolado realizado                             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ FASE 2: MAPEAMENTO (SMP-MAP)                           │
│                                                         │
│ Mapear TODO o escopo ANTES de corrigir qualquer        │
│ arquivo. Nunca assumir, sempre verificar com grep.     │
│                                                         │
│ Entregáveis:                                           │
│ • Total de ocorrências contabilizado                   │
│ • Lista completa de arquivos afetados                  │
│ • Distribuição por diretório/módulo                    │
│ • Relatório de mapeamento documentado                  │
│                                                         │
│ Critério de Saída:                                     │
│ • 100% das ocorrências identificadas                   │
│ • Relatório apresentado                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ FASE 3: CATEGORIZAÇÃO (SMP-CAT)                        │
│                                                         │
│ Agrupar ocorrências por TIPO DE CORREÇÃO, não por      │
│ arquivo. Isso permite correções em lote consistentes.  │
│                                                         │
│ Entregáveis:                                           │
│ • Categorias definidas (A, B, C...)                    │
│ • Template de correção por categoria                   │
│ • Priorização por criticidade                          │
│ • Estimativa de esforço por categoria                  │
│ • Plano de fases documentado                           │
│                                                         │
│ Critério de Saída:                                     │
│ • Todas ocorrências categorizadas                      │
│ • Plano de fases criado                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ FASE 4: APROVAÇÃO (SMP-APPROVE)                        │
│                                                         │
│ NUNCA executar correção em massa sem aprovação         │
│ explícita do plano de fases.                           │
│                                                         │
│ Entregáveis:                                           │
│ • Relatório de mapeamento apresentado                  │
│ • Plano de fases apresentado                           │
│ • Riscos identificados                                 │
│ • Aprovação documentada com timestamp                  │
│                                                         │
│ Critério de Saída:                                     │
│ • Mensagem "APROVADO" explícita recebida               │
│ • Escopo aprovado documentado                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ FASE 5: EXECUÇÃO (SMP-EXEC)                            │
│                                                         │
│ Executar correções por CATEGORIA, não por arquivo.     │
│ Checkpoints obrigatórios entre categorias.             │
│                                                         │
│ Entregáveis:                                           │
│ • Correções aplicadas por categoria                    │
│ • Commit por categoria (não por arquivo)               │
│ • Checkpoint com relatório após cada categoria         │
│ • Verificação de compilação                            │
│                                                         │
│ Critério de Saída:                                     │
│ • Todas categorias processadas                         │
│ • Zero erros de compilação                             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ FASE 6: VERIFICAÇÃO (SMP-VERIFY)                       │
│                                                         │
│ Verificar que TODAS as ocorrências foram corrigidas    │
│ e nenhuma nova foi introduzida.                        │
│                                                         │
│ Entregáveis:                                           │
│ • grep final = 0 ocorrências do problema               │
│ • npx tsc --noEmit = 0 erros relacionados              │
│ • Testes passando                                      │
│ • Relatório final com métricas                         │
│                                                         │
│ Critério de Saída:                                     │
│ • Problema 100% eliminado                              │
│ • CI/CD passando                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 CICLO DE RETROALIMENTAÇÃO

### Learning Loop

```
ISSUE/BUG DETECTADO
        │
        ▼
┌───────────────────┐
│ 1. DOCUMENTAR     │──► O que falhou, onde, código atual
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 2. ANALISAR       │──► Causa raiz, categoria SMP, impacto
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 3. CLASSIFICAR    │──► Nova regra? Atualizar? Anti-pattern?
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 4. ATUALIZAR      │──► regrasmcp.mdc, contratos MCP
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 5. REGISTRAR      │──► SMP_LESSONS_LEARNED.md
└────────┬──────────┘
         │
         └──────────────► Retroalimenta próxima execução
```

### Quando Registrar Lição Aprendida

| Situação | Ação |
|----------|------|
| Bug introduzido durante refatoração | SEMPRE registrar |
| Padrão incorreto aplicado | SEMPRE registrar |
| Correção que quebrou código | SEMPRE registrar |
| Nova técnica descoberta | Registrar como padrão |
| Abordagem que não funcionou | Registrar como anti-pattern |

---

## 📊 TEMPLATES

### Template de Relatório de Mapeamento

```markdown
## RELATÓRIO DE MAPEAMENTO - [Nome da Refatoração]

### Sumário Executivo
- **Total de ocorrências:** [N]
- **Arquivos afetados:** [N]
- **Módulos/Diretórios:** [N]

### Distribuição por Diretório
| Diretório | Ocorrências | % |
|-----------|-------------|---|
| src/modules/ | X | Y% |
| src/services/ | X | Y% |
| ... | ... | ... |

### Comandos de Verificação Utilizados
```bash
[comandos grep executados]
```

### Anexos
- Lista completa de arquivos: [link ou inline]
```

### Template de Plano de Fases

```markdown
## PLANO DE FASES - [Nome da Refatoração]

### Fase X.1: [Nome da Categoria]
- **Padrão:** [descrição do padrão a corrigir]
- **Quantidade:** [N] ocorrências em [N] arquivos
- **Prioridade:** [CRÍTICA | ALTA | MÉDIA | BAIXA]
- **Estimativa:** [tempo]
- **Template de Correção:**
  ```typescript
  // Antes
  [código antes]
  
  // Depois
  [código depois]
  ```

### Fase X.2: [Nome da Categoria]
...

### Riscos Identificados
| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| ... | ... | ... | ... |
```

### Template de Checkpoint

```markdown
## CHECKPOINT - Fase [N]

### Progresso
- **Baseline:** [N] ocorrências
- **Corrigidas:** [N] ([%])
- **Restantes:** [N]

### Categorias Processadas
- [x] Categoria A - [N] arquivos
- [ ] Categoria B - Pendente

### Verificações
- grep "[padrão]": [N] resultados
- npx tsc --noEmit: [OK/ERRO]
- Testes: [PASS/FAIL]

### Commits Realizados
- [hash]: [mensagem]

### Status
[Continuando | Checkpoint | Bloqueado | Concluído]
```

---

## 📁 ESTRUTURA DE ARQUIVOS

```
.cursor/rules/
└── regrasmcp.mdc              # Regras do Cursor (inclui SMP)

docs/mcp/
├── SMP_METHODOLOGY.md         # Este arquivo - Metodologia principal
├── SMP_LESSONS_LEARNED.md     # Registro de lições aprendidas
├── SMP_PATTERNS_CATALOG.md    # Catálogo de padrões corretos
└── SMP_ANTI_PATTERNS.md       # O que NÃO fazer

mcp-server/src/contracts/
├── smp-methodology.json       # Contrato MCP da metodologia
└── lesson-learned.json        # Contrato MCP para registro
```

---

## 🔗 REFERÊNCIAS

- **Regras MCP:** `.cursor/rules/regrasmcp.mdc`
- **Lições Aprendidas:** `docs/mcp/SMP_LESSONS_LEARNED.md`
- **Catálogo de Padrões:** `docs/mcp/SMP_PATTERNS_CATALOG.md`
- **Anti-Patterns:** `docs/mcp/SMP_ANTI_PATTERNS.md`
- **Contrato Metodologia:** `mcp-server/src/contracts/smp-methodology.json`
- **Contrato Lições:** `mcp-server/src/contracts/lesson-learned.json`

---

## 📝 HISTÓRICO DE VERSÕES

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0.0 | 07/01/2026 | Versão inicial baseada em E7.15 |
