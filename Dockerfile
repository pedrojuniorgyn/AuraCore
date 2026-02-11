# ==============================================================================
# AURACORE - Dockerfile otimizado para deploy via Coolify
# ==============================================================================
# Otimizações aplicadas:
#   - .dockerignore exclui ~207MB de arquivos desnecessarios
#   - BuildKit cache mount para webpack incremental (~75% mais rapido)
#   - output: 'standalone' reduz imagem de ~2GB para ~200MB
#   - tee mostra progresso do build no log do Coolify
# ==============================================================================

# --- Stage 1: Dependencies ---
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Coolify pode injetar NODE_ENV=production em build-time.
# Para o Next build funcionar, precisamos de devDependencies neste stage.
ENV NODE_ENV=development
RUN npm ci --legacy-peer-deps --include=dev

# --- Stage 2: Builder ---
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# Garante que o código reconheça "fase de build" (Coolify/Next às vezes não setam isso)
ENV NEXT_PHASE=phase-production-build

# Next.js build com cache persistente do webpack (BuildKit cache mount)
# - --mount=type=cache: .next/cache persiste entre builds para compilacao incremental
# - --webpack: OBRIGATORIO no Next.js 16 (Turbopack e padrao, mas precisamos de webpack
#   para mangleExports=false + reflect-metadata entry point injection para tsyringe DI)
# - DEBUG=: desabilita debug loggers (Coolify injeta DEBUG via build-arg, causando
#   milhares de mensagens 'jsconfig-paths-plugin' que estouram o log limit de 2MiB)
# - tee: salva log completo para diagnostico; grep -v filtra ruido do stdout do Coolify
RUN --mount=type=cache,target=/app/.next/cache \
    bash -o pipefail -c 'DEBUG= npx next build --webpack 2>&1 \
    | tee /tmp/next-build.log \
    | grep -v "jsconfig-paths-plugin\|next:resolve\|next:router"' \
    || (echo "---- NEXT BUILD LOG (tail) ----" && tail -n 200 /tmp/next-build.log && exit 1)

# --- Stage 3: Runner (Production) ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Next.js standalone output: server.js + minimal node_modules (~50MB vs 1.8GB)
COPY --from=builder /app/.next/standalone ./
# Static assets e public devem ser copiados manualmente com standalone
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Necessário para rodar scripts (seed/migrations) via `docker compose exec web ...`
# Nota: standalone inclui deps de producao (mssql, drizzle-orm).
# Para drizzle-kit (devDep): docker exec web npx --yes drizzle-kit push
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# E13.3: Entrypoint que executa migrations antes de iniciar o servidor
RUN chmod +x scripts/docker-entrypoint.sh

EXPOSE 3000
# Usa entrypoint para executar migrations pendentes antes de iniciar o Next.js
# Variáveis de controle:
#   SKIP_MIGRATIONS=true    - Pular migrations (debug/emergência)
#   MIGRATION_OPTIONAL=true - Não falhar se DB indisponível
CMD ["bash", "scripts/docker-entrypoint.sh"]
