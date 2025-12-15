# Runbook — Deploy no Coolify (AuraCore)

## Objetivo
Garantir deploy previsível do AuraCore (Next.js App Router + SQL Server 2022) no Coolify, com env vars corretas, healthchecks e diagnósticos rápidos.

## Arquivos relevantes no repo
- `Dockerfile` (multi-stage build)
- `docker-compose.coolify.yml` (ambiente recomendado no Coolify)
- `src/app/api/health/route.ts` (healthcheck do app)
- `src/lib/db/index.ts` (pool + TLS/SNI)
- `src/lib/auth.ts` (fallback controlado para build phase)

## 1) Pré-requisitos (antes do primeiro deploy)
### 1.1 Variáveis de ambiente mínimas
**Banco**
- `DB_HOST`
- `DB_PORT` (default 1433)
- `DB_USER` (ex.: sa)
- `DB_PASSWORD` (obrigatório e forte)
- `DB_NAME`
- `DB_ENCRYPT` (true/false)
- `DB_TRUST_CERT` (true/false)
- `DB_SERVERNAME` (obrigatório se `DB_ENCRYPT=true` e `DB_HOST` for IP)

**Auth**
- `APP_URL`
- `NEXTAUTH_URL` (ou derivado de APP_URL)
- `AUTH_URL` (ou derivado de APP_URL)
- `AUTH_SECRET` (obrigatório em produção)
- `AUTH_TRUST_HOST` (normalmente true no Coolify)
- (Opcional) `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GOOGLE_ALLOWED_DOMAINS`

**Operação**
- `ENABLE_CRON` (true/false)

### 1.2 SQL Server 2022 (Linux)
- Se usar `docker-compose.coolify.yml`:
  - serviço `sql` usa volume persistente `sql_data`
  - healthcheck usa `sqlcmd` para validar `SELECT 1`

## 2) Build (o que observar)
### 2.1 Sobre build-time env vars
- O `Dockerfile` instala devDependencies no stage de build para permitir `next build`.
- `src/lib/auth.ts` evita quebrar build quando `AUTH_SECRET`/Google vars não existem no build.

### 2.2 Diagnóstico de falha de build
- Abrir logs do build no Coolify.
- Corrigir dependências/erros conforme necessário.

> Observação: `next.config.ts` está com `typescript.ignoreBuildErrors=true`, o que facilita deploy, mas aumenta risco de regressões.

## 3) Runtime (o que valida que está “no ar”)
### 3.1 Healthcheck do app
- Endpoint: `GET /api/health` (não toca DB)

### 3.2 Healthcheck do SQL Server
- Via compose: `sqlcmd SELECT 1`

## 4) Checklist de deploy
- [ ] `DB_PASSWORD` correto e forte
- [ ] `AUTH_SECRET` setado (runtime)
- [ ] `APP_URL`/`NEXTAUTH_URL`/`AUTH_URL` corretos
- [ ] Se `DB_ENCRYPT=true` com IP: `DB_SERVERNAME` setado
- [ ] `/api/health` retorna 200
- [ ] SQL healthcheck OK
- [ ] Login (Google/Credentials) OK
- [ ] Smoke test: listar Branches / Products / Business Partners

## 5) Troubleshooting rápido
### 5.1 App sobe, mas login falha
- Verificar `AUTH_SECRET`, `NEXTAUTH_URL`, cookies/same-site
- Verificar DB conectado (NextAuth adapter depende do DB)

### 5.2 App sobe, mas DB não conecta
- Verificar `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`
- Verificar TLS/SNI (`DB_SERVERNAME`) quando aplicável

### 5.3 Degradação de performance
- Checar pool (conexões) e timeouts
- Checar Query Store (top queries)
