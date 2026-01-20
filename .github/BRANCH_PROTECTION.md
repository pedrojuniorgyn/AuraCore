# Branch Protection Rules

Documentação das regras de proteção de branches para o repositório AuraCore.

## Configuração no GitHub

Acesse: **Settings > Branches > Add rule**

---

## Main Branch

### Branch name pattern
```
main
```

### Protection rules

#### Require a pull request before merging
- [x] **Require approvals:** 1
- [x] **Dismiss stale pull request approvals when new commits are pushed**
- [x] **Require review from Code Owners**

#### Require status checks to pass before merging
- [x] **Require branches to be up to date before merging**

**Required status checks:**
| Check | Description |
|-------|-------------|
| `🔍 Frontend - Lint` | ESLint + TypeScript |
| `🧪 Frontend - Test` | Vitest unit tests |
| `🏗️ Frontend - Build` | Next.js build |
| `🐍 Agents - Lint` | Ruff lint |
| `🧪 Agents - Test` | Pytest |
| `📊 CI Summary` | Overall CI status |

#### Additional settings
- [x] **Require conversation resolution before merging**
- [x] **Do not allow bypassing the above settings**
- [ ] Require signed commits (opcional)
- [ ] Require linear history (opcional)

---

## Develop Branch

### Branch name pattern
```
develop
```

### Protection rules

#### Require status checks to pass before merging
- [x] **Require branches to be up to date before merging**

**Required status checks:**
| Check | Description |
|-------|-------------|
| `🔍 Frontend - Lint` | ESLint + TypeScript |
| `🐍 Agents - Lint` | Ruff lint |

#### Additional settings
- [ ] Require approvals (não obrigatório para develop)
- [x] **Allow force pushes** (apenas para admins)

---

## Feature Branches

Branches com padrão `feature/*`, `fix/*`, `chore/*` não têm proteção especial.

### Convenção de nomes
```
feature/EPIC-XX-descricao
fix/ISSUE-XX-descricao
chore/descricao
hotfix/descricao-urgente
```

---

## Secrets Necessários

Configure em: **Settings > Secrets and variables > Actions**

| Secret | Descrição | Obrigatório |
|--------|-----------|-------------|
| `ANTHROPIC_API_KEY_TEST` | API key para testes de agentes | Sim |
| `COOLIFY_WEBHOOK_STAGING` | Webhook para deploy staging | Para CD |
| `COOLIFY_WEBHOOK_PRODUCTION` | Webhook para deploy produção | Para CD |
| `CODECOV_TOKEN` | Token do Codecov | Opcional |

---

## Environments

Configure em: **Settings > Environments**

### Staging
- **Protection rules:** None (auto-deploy)
- **URL:** https://staging.auracore.com.br

### Production
- **Protection rules:**
  - [x] Required reviewers: 1
  - [x] Wait timer: 5 minutes (opcional)
- **URL:** https://auracore.com.br

---

## CODEOWNERS

O arquivo `.github/CODEOWNERS` define responsáveis por revisão:

```
# Default owners
* @pedrojuniorgyn

# Frontend
/src/ @pedrojuniorgyn

# Agents
/agents/ @pedrojuniorgyn

# CI/CD
/.github/ @pedrojuniorgyn

# Database
/drizzle/ @pedrojuniorgyn
```

---

## Referências

- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Actions Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
