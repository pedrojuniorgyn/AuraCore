# 🚨 HOTFIX Fase 6 - Execução Direta no Servidor

**Cenário:** Sem ambiente local, aplicação roda apenas no Coolify  
**Método:** Aplicar migrations diretamente no servidor de produção  
**Risco:** MÉDIO (sem teste local prévio, mas migrations são seguras)

---

## 📋 Pré-requisitos

- [ ] Acesso SSH ao servidor Coolify
- [ ] Migrations commitadas no Git
- [ ] Backup do banco confirmado (Coolify faz backup automático)

---

## 🎯 Método 1: Via Coolify Auto-Deploy (RECOMENDADO)

### Passo 1: Push para Main

```bash
cd ~/aura_core

# Verificar que migrations estão criadas
ls -la drizzle/migrations/005*.sql

# Deve mostrar:
# 0056_hotfix_add_who_email.sql
# 0057_hotfix_fix_fk_organizations.sql

# Commit e push
git add drizzle/migrations/005*.sql
git add docs/*.md

git commit -m "hotfix(fase6): BUG-020 e BUG-021 - schema mismatch + FK inválidas"

git push origin main
```

### Passo 2: Verificar Deploy no Coolify

```bash
# 1. Abrir Coolify UI
open https://[seu-coolify]/resources/[seu-app]

# 2. Acompanhar logs em tempo real
# Procurar por:
# - "Running migrations..."
# - "Migration 0056_hotfix_add_who_email.sql applied"
# - "Migration 0057_hotfix_fix_fk_organizations.sql applied"
# - "✓ All 3 foreign keys created successfully!"

# 3. Se ver "Deployment successful" → Sucesso!
```

### Passo 3: Validação Pós-Deploy

```bash
# Testar APIs via curl
curl https://tcl.auracore.cloud/api/strategic/dashboard/data

# Deve retornar JSON com dados (não mais erro 500)

# Testar via browser
open https://tcl.auracore.cloud/strategic/dashboard

# Verificar:
# - Cards carregam com números
# - Console sem erros SQL
# - Sem "Invalid column name 'who_email'"
```

---

## 🔧 Método 2: Migrations Manuais via SSH (Fallback)

**Usar se:** Coolify NÃO aplicar migrations automaticamente

### Passo 1: Conectar ao Servidor

```bash
# SSH no servidor Coolify
ssh user@[ip-do-servidor]

# Encontrar container web
docker ps | grep web

# Deve mostrar algo como:
# web-zksk8s0kk08sksgwggkos0gw-020231074215
```

### Passo 2: Executar Migrations Dentro do Container

```bash
# Entrar no container
CONTAINER_NAME="web-zksk8s0kk08sksgwggkos0gw-020231074215"  # Ajustar!
docker exec -it $CONTAINER_NAME bash

# Dentro do container:
cd /app

# Verificar migrations pendentes
npm run db:studio
# Ou ver lista de migrations:
ls -la drizzle/migrations/ | grep 005

# Aplicar migrations
npm run db:migrate

# Deve mostrar:
# ✓ Migration 0056_hotfix_add_who_email.sql applied
# ✓ Migration 0057_hotfix_fix_fk_organizations.sql applied
# ✓ All 3 foreign keys created successfully!

# Sair do container
exit
```

### Passo 3: Reiniciar Container (se necessário)

```bash
# Se migrations não surtiram efeito imediato:
docker restart $CONTAINER_NAME

# Aguardar health check
docker ps | grep $CONTAINER_NAME
# STATUS deve voltar a "healthy" em ~30s
```

### Passo 4: Validação

```bash
# Testar API
curl https://tcl.auracore.cloud/api/strategic/dashboard/data

# Ou via browser
open https://tcl.auracore.cloud/strategic/dashboard
```

---

## 🔍 Método 3: Aplicar SQL Diretamente no Banco (ÚLTIMA OPÇÃO)

**Usar apenas se:** Métodos 1 e 2 falharem

```bash
# 1. Conectar ao banco SQL Server
# Via Azure Data Studio / SSMS / Docker exec no container SQL

docker exec -it sql-zksk8s0kk08sksgwggkos0gw-XXXXXX bash

# 2. Conectar ao banco
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P [senha] -d AuraCore

# 3. Copiar e colar conteúdo de 0056_hotfix_add_who_email.sql
# (conteúdo já está em drizzle/migrations/)

ALTER TABLE strategic_action_plan
ADD who_email VARCHAR(255) NULL;
GO

CREATE NONCLUSTERED INDEX idx_action_plan_who_email
ON strategic_action_plan(who_email)
WHERE who_email IS NOT NULL AND deleted_at IS NULL;
GO

-- Validar
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'strategic_action_plan' AND COLUMN_NAME = 'who_email';
GO

# 4. Copiar e colar conteúdo de 0057_hotfix_fix_fk_organizations.sql
# (executar script completo)

# 5. Verificar que FKs foram criadas
SELECT name FROM sys.foreign_keys 
WHERE name IN (
    'fk_approval_history_org',
    'fk_approval_delegate_org', 
    'FK_department_organization'
);
GO

# Deve retornar 3 linhas

# 6. Sair
exit
```

---

## ✅ Checklist de Validação

### Pós-Aplicação das Migrations

```bash
# 1. Verificar schema
docker exec [container] npm run db:studio

# 2. Testar APIs (todas devem retornar 200)
curl https://tcl.auracore.cloud/api/strategic/dashboard/data
curl https://tcl.auracore.cloud/api/strategic/map
curl https://tcl.auracore.cloud/api/strategic/action-plans/kanban
curl https://tcl.auracore.cloud/api/strategic/goals/new

# 3. Testar UI via Browser
open https://tcl.auracore.cloud/strategic/dashboard
# Verificar:
# - [ ] Cards carregam com números
# - [ ] Console sem erros 500
# - [ ] Sem "Invalid column name 'who_email'"
# - [ ] Loading spinners param

open https://tcl.auracore.cloud/strategic/map
# Verificar:
# - [ ] Mapa carrega objetivos
# - [ ] Cards de status aparecem

open https://tcl.auracore.cloud/strategic/pdca
# Verificar:
# - [ ] Kanban carrega
# - [ ] Filtros funcionam

# 4. Criar Action Plan de teste
open https://tcl.auracore.cloud/strategic/action-plans/new
# Preencher formulário:
# - What: Teste Hotfix
# - Who Type: EMAIL
# - Who Email: teste@email.com ← CAMPO NOVO!
# - Salvar
# Deve retornar 200 (não mais 500)
```

---

## 🆘 Troubleshooting

### Problema 1: "Migration already applied"

```bash
# Verificar quais migrations já foram aplicadas
docker exec [container] bash -c "cat drizzle/migrations/meta/_journal.json"

# Se 0056 ou 0057 já estão no journal mas coluna não existe:
# Significa que migration falhou silenciosamente
# Solução: Aplicar SQL diretamente (Método 3)
```

### Problema 2: "Cannot find module 'drizzle-kit'"

```bash
# Migration tool não instalado no container
# Solução: Usar Método 3 (SQL direto)
```

### Problema 3: APIs ainda retornam 500 após migration

```bash
# Ver logs do container
docker logs [container] --tail 100

# Procurar por:
# - "Invalid column name 'who_email'" ← Migration não aplicada
# - Outro erro SQL ← Bug diferente

# Se who_email ainda falha:
# 1. Verificar que coluna existe:
docker exec [sql-container] /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P [senha] -d AuraCore -Q "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'strategic_action_plan' AND COLUMN_NAME = 'who_email'"

# Se retornar vazio → Aplicar SQL manualmente (Método 3)
```

### Problema 4: Foreign Keys não criadas

```bash
# Verificar FKs atuais
docker exec [sql-container] /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P [senha] -d AuraCore -Q "SELECT name FROM sys.foreign_keys WHERE name LIKE 'fk_%org%'"

# Se retornar menos de 3 linhas:
# → Aplicar 0057 manualmente via SQL (Método 3)
```

---

## 📊 Estimativa de Tempo

| Etapa | Tempo | Risco |
|-------|-------|-------|
| **Método 1 (Coolify Auto)** | 5-10min | BAIXO |
| **Método 2 (SSH + npm)** | 10-15min | BAIXO |
| **Método 3 (SQL Direto)** | 15-20min | MÉDIO |
| **Validação** | 5min | - |
| **TOTAL** | 10-25min | BAIXO-MÉDIO |

---

## ⚠️ Considerações Importantes

### Sem Rollback Fácil
Como não há ambiente local para testar primeiro:
- ✅ Migrations são **aditivas** (apenas ADD COLUMN, não DROP)
- ✅ Se falhar, não quebra o que já funciona
- ⚠️ Mas não há como "desfazer" facilmente (precisaria remover coluna manualmente)

### Backup é Crítico
- ✅ Coolify faz backup automático do banco
- ✅ Confirmar que último backup é recente (<24h)
- ✅ Em caso de desastre: restaurar backup

### Monitoramento Pós-Deploy
- 👁️ Acompanhar logs em tempo real durante 5-10min após deploy
- 👁️ Verificar se usuários reportam novos erros
- 👁️ Testar fluxos críticos manualmente

---

## 🎯 Recomendação Final

**Usar Método 1** (Coolify Auto-Deploy):
- ✅ Mais simples
- ✅ Coolify aplica migrations automaticamente
- ✅ Auditoria completa nos logs
- ✅ Rollback via Coolify UI (se necessário)

**Se Método 1 falhar:**
- 🔧 Usar Método 2 (SSH + npm run db:migrate)

**Apenas em último caso:**
- 🆘 Usar Método 3 (SQL direto)

---

**Executar agora? Diga "sim" e te guio passo-a-passo!** 🚀
