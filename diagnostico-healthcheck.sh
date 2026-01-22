#!/bin/bash
# Diagnóstico detalhado do healthcheck

CONTAINER=$(docker ps | grep zksk8s0kk08sksgwggkos0gw | head -1 | awk '{print $1}')

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  DIAGNÓSTICO DETALHADO - HEALTHCHECK FALHOU                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "=== 1. ÚLTIMO LOG COMPLETO DO HEALTHCHECK ==="
docker logs $CONTAINER 2>&1 | grep -A50 "ops.health.started" | tail -55
echo ""

echo "=== 2. VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS ==="
echo "Healthcheck verifica estas variáveis:"
echo "  - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
echo "  - AUTH_SECRET"
echo "  - APP_URL"
echo ""
echo "Valores atuais:"
docker exec $CONTAINER env | grep -E "^(DB_HOST|DB_USER|DB_PASSWORD|DB_NAME|AUTH_SECRET|APP_URL)=" | sort
echo ""

echo "=== 3. TYPO NO APP_URL? ==="
echo "Verificando se APP_URL tem 'clud' em vez de 'cloud':"
docker exec $CONTAINER env | grep APP_URL | grep -o "clud" && echo "⚠️  TYPO DETECTADO!" || echo "✅ Sem typo"
echo ""

echo "=== 4. TABELA IDEMPOTENCY_KEYS EXISTE? ==="
docker exec $CONTAINER sh -c "curl -s http://localhost:3000/api/health 2>&1" | head -20
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  AÇÕES POSSÍVEIS                                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Se AUTH_SECRET está ausente:"
echo "  → Adicionar no Coolify: AUTH_SECRET=qrRi7CqXxttp7qecvk5rgFD4M6BE4Q1Z0SmAr2Yriqym8wMePRZ26MuuFtElKqXX"
echo ""
echo "Se APP_URL tem typo 'clud':"
echo "  → Corrigir no Coolify: APP_URL=https://tcl.auracore.cloud"
echo ""
echo "Se tabela idempotency_keys não existe:"
echo "  → Rodar migrations: docker exec \$CONTAINER npm run migrate"
echo ""
