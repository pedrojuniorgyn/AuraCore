# ============================================
# ATUALIZAÇÃO _documentation/00_INDICE_MASTER.md
# ============================================
# Data/Hora: 2026-01-05 17:10:00 UTC
# Épico: E7.12
# Autor: Claude (Arquiteto Enterprise)
# 
# INSTRUÇÕES: Adicionar seção E7 DDD/Hexagonal ao índice master
# ============================================

# 📚 ÍNDICE MASTER - AURACORE DOCUMENTATION

**Data de Atualização:** 2026-01-05 17:10:00 UTC  
**Versão:** 3.0.0

---

## 📁 Estrutura de Diretórios

```
_documentation/
├── 00_INDICE_MASTER.md          ← ESTE ARQUIVO
├── planning/                     # Planejamentos e roadmaps
├── reports/                      # Relatórios de execução
├── technical/                    # Documentação técnica
└── decisions/                    # Decisões de projeto

docs/
├── architecture/                 # Arquitetura formal
│   ├── adr/                      # Architecture Decision Records
│   ├── contracts/                # Contratos invariáveis
│   ├── diagrams/                 # Diagramas C4, sequência
│   ├── domains/                  # Documentação por domínio
│   └── runbooks/                 # Guias operacionais
├── mcp/                          # MCP Server documentation
└── fiscal/                       # Documentação fiscal
```

---

## 🗂️ ÍNDICE POR CATEGORIA

### 1. Arquitetura

| Documento | Localização | Descrição |
|-----------|-------------|-----------|
| INDEX.md | docs/architecture/ | Índice da arquitetura |
| GLOSSARY.md | docs/architecture/ | Glossário de termos |
| ENTERPRISE_BASE_PATTERN.md | docs/ | Padrões enterprise |
| DATA_SCOPING_BY_BRANCH.md | docs/ | Multi-tenancy e branch |

### 2. ADRs (Architecture Decision Records)

| ADR | Título | Data |
|-----|--------|------|
| ADR-0001 | SQL Server only | 2024-12 |
| ADR-0002 | Tenant Context | 2024-12 |
| ADR-0003 | UserId UUID string | 2024-12 |
| ADR-0004 | Admin HTTP OFF em PROD | 2024-12 |
| ADR-0005 | Transações obrigatórias | 2024-12 |
| ADR-0006 | Paginação SQL Server | 2024-12 |
| ADR-0010 | IBS/CBS Implementation | 2025-12 |
| ADR-0011 | Split Payment Structure | 2025-12 |
| **ADR-0012** | **Full DDD Migration** | **2026-01** |
| **ADR-0013** | **Eliminate Hybrid Architecture** | **2026-01** |

### 3. Contracts

| Contrato | Localização | Categoria |
|----------|-------------|-----------|
| TENANT_BRANCH_CONTRACT.md | docs/architecture/contracts/ | Multi-tenancy |
| RBAC_CONTRACT.md | docs/architecture/contracts/ | Segurança |
| API_CONTRACT.md | docs/architecture/contracts/ | API |
| ERROR_CONTRACT.md | docs/architecture/contracts/ | Erros |
| TRANSACTIONS_CONTRACT.md | docs/architecture/contracts/ | SQL |
| SQLSERVER_PERFORMANCE_CONTRACT.md | docs/architecture/contracts/ | Performance |

### 4. Domínios

| Domínio | Localização | Status |
|---------|-------------|--------|
| FINANCEIRO.md | docs/architecture/domains/ | ✅ Completo |
| CONTABIL.md | docs/architecture/domains/ | ✅ Completo |
| ADMIN.md | docs/architecture/domains/ | ✅ Completo |
| TMS.md | docs/architecture/domains/ | ✅ Completo |
| WMS.md | docs/architecture/domains/ | ✅ Completo (E7.8) |
| AUDITORIA_V2.md | docs/architecture/domains/ | 🔄 Em progresso |

---

## 🎯 E7 DDD/HEXAGONAL MIGRATION ← **NOVA SEÇÃO**

### Visão Geral

O épico E7 migrou o AuraCore de arquitetura Vertical Slice para DDD/Hexagonal. Iniciado em Dezembro 2024, foi completado (E7.0-E7.11) em Dezembro 2025.

### Documentos Principais

| Documento | Localização | Descrição |
|-----------|-------------|-----------|
| **E7_DDD_HEXAGONAL.md** | docs/architecture/ | Visão geral da migração |
| **E7_STATUS_FINAL.md** | docs/ | Consolidação E7.0-E7.11 |
| **E7.12_DOCUMENTATION_MASTER.md** | docs/ | Master document E7.12 |

### Roadmaps

| Documento | Localização | Período |
|-----------|-------------|---------|
| ROADMAP_E7.12_A_E7.17.md | _documentation/planning/ | Jan-Abr 2026 |
| ROADMAP_ONDAS_5A_A_9_ATUALIZADO.md | _documentation/planning/ | Atualizado |

### Épicos E7

| Épico | Nome | Status | Semanas |
|-------|------|--------|---------|
| E7.0 | Setup + Infraestrutura | ✅ COMPLETO | 1 |
| E7.1 | Shared Kernel + Value Objects | ✅ COMPLETO | 1 |
| E7.2 | Módulo Financial | ✅ COMPLETO | 4 |
| E7.3 | Módulo Accounting | ✅ COMPLETO | 4 |
| E7.4 | Módulo Fiscal | ✅ COMPLETO | 5 |
| E7.4.1 | Reforma Tributária 2026 | ✅ COMPLETO | 10 |
| E7.5 | Módulo TMS | ✅ COMPLETO | 1 |
| E7.6 | Módulo WMS Inicial | ✅ COMPLETO | 2 |
| E7.7 | Integrações (absorvido E7.9) | ✅ COMPLETO | - |
| E7.8 | Módulo WMS Completo | ✅ COMPLETO | 4 |
| E7.9 | Integrações Externas | ✅ COMPLETO | 2 |
| E7.10 | Cleanup + CI/CD | ✅ COMPLETO | 3 |
| E7.11 | Test Infrastructure | ✅ COMPLETO | 2 |
| **E7.12** | **Documentação 100%** | **🟡 EM EXECUÇÃO** | **1** |
| E7.13 | Services → DDD | ⬜ PLANEJADO | 3 |
| E7.14 | APIs → Features | ⬜ PLANEJADO | 2 |
| E7.15 | SPED → DDD | ⬜ PLANEJADO | 4 |
| E7.16 | Verificação Semântica | ⬜ PLANEJADO | 1 |
| E7.17 | Limpeza Final | ⬜ PLANEJADO | 1 |

**Total realizado:** ~40 semanas  
**Total planejado (E7.12-E7.17):** 13 semanas

---

## 📊 MCP SERVER

### Documentação

| Documento | Localização | Descrição |
|-----------|-------------|-----------|
| SYSTEM_GUIDE.md | docs/mcp/ | Guia completo do MCP |
| LESSONS_LEARNED.md | docs/mcp/ | Lições aprendidas |
| PHASE_2_COMPLETE.md | docs/mcp/ | Status fase 2 |

### ENFORCE Rules

| Range | Módulo | Quantidade |
|-------|--------|------------|
| ENFORCE-001 a ENFORCE-010 | Financial | 10 |
| ENFORCE-011 a ENFORCE-015 | Accounting | 5 |
| ENFORCE-016 a ENFORCE-020 | Fiscal | 5 |
| ENFORCE-021 a ENFORCE-029 | WMS | 9 |

**Total:** 29 regras ENFORCE

---

## 📅 PLANNING

| Documento | Localização | Descrição |
|-----------|-------------|-----------|
| ROADMAP_MASTER_AURACORE.md | _documentation/planning/ | Roadmap master |
| ROADMAP_ONDAS_5A_A_9_ATUALIZADO.md | _documentation/planning/ | Ondas infra |
| ROADMAP_E7.12_A_E7.17.md | _documentation/planning/ | E7 fase 2 |

---

## 📋 REPORTS

| Documento | Localização | Descrição |
|-----------|-------------|-----------|
| RESULTADO_FINAL_MARATONA.md | _documentation/reports/ | Maratona inicial |
| MARATONA_FINALIZADA.md | _documentation/reports/ | Conclusão maratona |

---

## 🔧 TECHNICAL

| Documento | Localização | Descrição |
|-----------|-------------|-----------|
| REFATORACAO_NCM_PCG.md | _documentation/technical/ | Refatoração NCM |
| AURORA_PREMIUM_GRID_SHOWCASE.md | _documentation/technical/ | AG Grid premium |

---

## 📝 FISCAL

| Documento | Localização | Descrição |
|-----------|-------------|-----------|
| TAX_REFORM_2026_README.md | docs/fiscal/ | Reforma Tributária |
| TRANSITION_RATES.md | docs/fiscal/ | Alíquotas transição |

---

## 🏷️ QUICK LINKS

### Para Novos Desenvolvedores
1. [GLOSSARY.md](docs/architecture/GLOSSARY.md) - Entender os termos
2. [E7_DDD_HEXAGONAL.md](docs/architecture/E7_DDD_HEXAGONAL.md) - Arquitetura atual
3. [SYSTEM_GUIDE.md](docs/mcp/SYSTEM_GUIDE.md) - Como usar MCP

### Para Arquitetos
1. [INDEX.md](docs/architecture/INDEX.md) - Índice completo
2. [ADRs](docs/architecture/adr/) - Decisões arquiteturais
3. [Contracts](docs/architecture/contracts/) - Regras invariáveis

### Para DevOps
1. [Runbooks](docs/architecture/runbooks/) - Guias operacionais
2. [CI/CD](.github/workflows/) - Pipelines

---

*Índice atualizado em: 2026-01-05 17:10:00 UTC*
*Versão: 3.0.0*
