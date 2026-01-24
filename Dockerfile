FROM node:25-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Coolify pode injetar NODE_ENV=production em build-time.
# Para o Next build funcionar, precisamos de devDependencies neste stage.
ENV NODE_ENV=development
RUN npm ci --legacy-peer-deps --include=dev

FROM node:25-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# Garante que o código reconheça "fase de build" (Coolify/Next às vezes não setam isso)
ENV NEXT_PHASE=phase-production-build
# CRÍTICO: Limpar TODOS os caches do Next.js para garantir rebuild completo
# Isso previne que chunks JavaScript antigos sejam reusados após correções de código
RUN rm -rf .next node_modules/.cache
# Coolify às vezes não exibe o erro completo do build.
# Gravamos o log e imprimimos em caso de falha para diagnóstico.
# NEXT_PRIVATE_PREBUNDLED_REACT=next força Next.js a não usar cache interno
# CRÍTICO: Usar --webpack ao invés de Turbopack para garantir ordem correta de imports (reflect-metadata)
RUN NEXT_PRIVATE_PREBUNDLED_REACT=next npx next build --webpack > /tmp/next-build.log 2>&1 || (echo "---- NEXT BUILD LOG (tail) ----" && tail -n 200 /tmp/next-build.log && exit 1)

FROM node:25-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# ✅ Necessário para rodar scripts (seed/migrations) via `docker compose exec web ...`
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src ./src

EXPOSE 3000
CMD ["npm","run","start","--","-p","3000"]



