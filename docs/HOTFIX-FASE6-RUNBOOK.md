# 🚨 HOTFIX Fase 6 - Runbook de Execução

**Status:** 🔴 PRODUÇÃO COM BUG CRÍTICO  
**Urgência:** ALTA  
**Tempo Estimado:** 30 minutos  
**Risco:** BAIXO (apenas adiciona coluna e corrige FKs)

---

## 📋 Pré-requisitos

- [ ] Acesso SSH ao servidor de produção
- [ ] Acesso ao banco SQL Server
- [ ] Backup recente do banco (último automatic backup OK)
- [ ] Código local na branch `main` atualizada

---

## 🎯 Objetivo

Corrigir 2 bugs críticos que impedem o funcionamento do módulo Strategic:

1. **BUG-020:** Coluna `who_email` faltando no banco
2. **BUG-021:** Foreign keys inválidas (`organizations` → `organization`)

---

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Migration falhar | Baixa | Médio | SQL validado, usa transações |
| Downtime durante deploy | Certa | Baixo | ~2min, fora de horário pico |
| FK constraint fail | Baixa | Médio | Script verifica antes de criar |

**Rollback Plan:** Migrations são aditivas (não removem nada). Em caso de falha, simplesmente não aplicar e investigar.

---

## 📝 Procedimento de Execução

### Fase 1: Backup & Preparação (5 min)

```bash
# 1. Conectar ao servidor
ssh user@tcl.auracore.cloud

# 2. Verificar status atual
cd /path/to/app
docker ps | grep web

# 3. Backup automático já existe, mas confirmar:
# (via interface do banco ou Coolify UI)
```

### Fase 2: Aplicar Migrations Localmente (5 min)

```bash
# No seu Mac (local)
cd ~/aura_core

# 1. Garantir que está na main
git status
git pull origin main

# 2. Verificar migrations criadas
ls -la drizzle/migrations/005*

# Devem existir:
# - 0056_hotfix_add_who_email.sql
# - 0057_hotfix_fix_fk_organizations.sql

# 3. Testar localmente PRIMEIRO
npm run db:migrate

# 4. Validar que funcionou
npm run db:studio
# Verificar visualmente:
# - Tabela strategic_action_plan tem coluna who_email
# - Foreign keys criadas

# 5. Testar aplicação localmente
npm run build
npm run start

# 6. Abrir http://localhost:3000/strategic/dashboard
# Verificar que não há mais erros 500
```

### Fase 3: Commit & Push (2 min)

```bash
# Apenas se testes locais passaram!

git add drizzle/migrations/0056_hotfix_add_who_email.sql
git add drizzle/migrations/0057_hotfix_fix_fk_organizations.sql
git add docs/fase6-bugs-analysis.md
git add docs/HOTFIX-FASE6-RUNBOOK.md

git commit -m "hotfix: adicionar coluna who_email e corrigir FKs (BUG-020, BUG-021)

- Adiciona coluna who_email em strategic_action_plan (BUG-020)
- Corrige foreign keys organizations → organization (BUG-021)
- Resolve 100% dos erros 500 no módulo Strategic
- Migrations: 0056, 0057

Refs: docs/fase6-bugs-analysis.md"

git push origin main
```

### Fase 4: Deploy Automático via Coolify (10 min)

```bash
# Coolify detecta push na main e inicia deploy automaticamente

# 1. Acessar Coolify UI: https://coolify.auracore.cloud
# 2. Ir em Resources → AuraCore → web
# 3. Acompanhar logs do deploy:
#    - Pull image
#    - Build (skip, já está built)
#    - Apply migrations (IMPORTANTE!)
#    - Start containers
#    - Health checks

# 4. Aguardar "Deployment successful"
```

**Se Coolify não aplicar migrations automaticamente:**

```bash
# SSH no container
docker exec -it web-zksk8s0kk08sksgwggkos0gw-XXXXXXX bash

# Dentro do container
cd /app
npm run db:migrate

# Verificar logs
tail -f /var/log/app.log
```

### Fase 5: Validação Pós-Deploy (5 min)

```bash
# No seu Mac (local)
cd ~/aura_core

# 1. Executar script de validação
chmod +x scripts/validate-hotfix-fase6.sh
BASE_URL=https://tcl.auracore.cloud ./scripts/validate-hotfix-fase6.sh

# 2. Teste manual via browser
open https://tcl.auracore.cloud/strategic/dashboard
# Verificar:
# - [ ] Cards carregam com dados
# - [ ] Console sem erros SQL
# - [ ] Spinner para de girar
# - [ ] Números aparecem (não mais "0")

open https://tcl.auracore.cloud/strategic/map
# Verificar:
# - [ ] Mapa carrega
# - [ ] Objetivos aparecem
# - [ ] Sem erros 500

open https://tcl.auracore.cloud/strategic/pdca
# Verificar:
# - [ ] Kanban carrega
# - [ ] Cards de status aparecem
# - [ ] Sem erros 500

# 3. Criar um Action Plan de teste
open https://tcl.auracore.cloud/strategic/action-plans/new
# Preencher formulário completo
# Salvar
# Verificar que salvou (200, não 500)
```

### Fase 6: Rollback (se necessário)

```bash
# Se algo der errado DURANTE a migration:

# 1. Conectar ao banco
# 2. Verificar qual migration falhou
SELECT * FROM drizzle_migrations ORDER BY created_at DESC;

# 3. Se 0056 falhou:
#    - Provavelmente coluna já existe (não é problema)
#    - Verificar: SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'strategic_action_plan' AND COLUMN_NAME = 'who_email'

# 4. Se 0057 falhou:
#    - FK já existe ou tabela referenciada não existe
#    - Verificar: SELECT * FROM sys.foreign_keys WHERE name LIKE 'fk_%org%'

# 5. Rollback não é necessário se:
#    - Migration adicionou coluna com sucesso (é aditiva)
#    - FK foi criada (não quebra nada)

# 6. Se realmente precisar reverter:
ALTER TABLE strategic_action_plan DROP COLUMN who_email;  -- Último recurso!
```

---

## ✅ Checklist Final

### Antes do Deploy
- [ ] Backup do banco confirmado
- [ ] Migrations testadas localmente
- [ ] Build local sem erros
- [ ] APIs testadas localmente (200 OK)
- [ ] Commit e push feitos

### Durante o Deploy
- [ ] Coolify iniciou deploy
- [ ] Logs não mostram erros de SQL
- [ ] Migrations aplicadas com sucesso
- [ ] Container reiniciou healthy
- [ ] Health check passa (200)

### Após o Deploy
- [ ] Dashboard carrega dados
- [ ] Mapa Estratégico funciona
- [ ] PDCA Kanban funciona
- [ ] Criar Action Plan funciona
- [ ] Console sem erros SQL
- [ ] Validação automatizada passou

### Comunicação
- [ ] Time notificado que fix foi aplicado
- [ ] Usuários podem testar
- [ ] Documentação atualizada

---

## 🔍 Troubleshooting

### Erro: "Invalid column name 'who_email'" AINDA acontece

**Causa:** Migration 0056 não foi aplicada.

**Solução:**
```bash
# Verificar se migration foi aplicada
docker exec web-XXX npm run db:studio
# Ou via SQL:
SELECT * FROM drizzle_migrations WHERE name LIKE '%0056%';

# Se não existe, aplicar manualmente:
docker exec web-XXX npm run db:migrate
```

### Erro: "Cannot create foreign key" ao aplicar 0057

**Causa:** Tabela `organization` não existe ou já há FK com esse nome.

**Solução:**
```bash
# 1. Verificar se tabela existe
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'organization';

# 2. Se existir, verificar FKs atuais
SELECT name FROM sys.foreign_keys WHERE name LIKE 'fk_%org%';

# 3. Se FK já existe, migration falhará mas não é problema
#    (constraint já está criada de outra forma)
```

### APIs ainda retornam 500 após hotfix

**Causa:** Pode haver outro erro não relacionado.

**Solução:**
```bash
# 1. Ver logs completos do container
docker logs web-XXX --tail 100

# 2. Procurar por erros SQL
grep "sql\|SQL\|error" 

# 3. Se erro for diferente de who_email:
#    - Abrir issue nova
#    - Documentar erro específico
#    - Investigar separadamente
```

---

## 📞 Contatos de Emergência

**Se algo der muito errado:**

1. **Rollback imediato:** Restaurar backup do banco
2. **Notificar time:** Slack #dev-alerts
3. **Escalar:** CTO / Tech Lead

**Horário recomendado de execução:**  
- Manhã (8h-10h) ou Tarde (14h-16h)
- Evitar horário de almoço (11h-13h)
- Evitar final de expediente (17h+)

---

## 📚 Documentação Relacionada

- [Análise Completa de Bugs](./fase6-bugs-analysis.md)
- [Fase 6 Implementation Log](../logs/fase6-implementation.md)
- [Lições Aprendidas](../MEMORY.md)

---

**Última Atualização:** 2026-02-02  
**Autor:** Aura Core AI Assistant  
**Revisão:** Pendente (aplicar após execução bem-sucedida)
