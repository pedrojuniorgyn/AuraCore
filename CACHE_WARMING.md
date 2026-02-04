# Cache Warming

## Configuração

Adicionar ao `.env` (produção) ou `.env.local` (desenvolvimento):

```bash
# Cache Warming
# Pré-carrega dados essenciais no cache durante startup
# Recomendado: true em produção, false em desenvolvimento
CACHE_WARMING_ENABLED=true
```

## Uso Manual

```bash
# Executar warming manualmente
npm run warm:cache
```

## Como Funciona

1. **Startup Automático:** Se `CACHE_WARMING_ENABLED=true`, o warming executa automaticamente via `instrumentation.ts`
2. **Background Task:** Não bloqueia o startup do servidor
3. **Dados Pré-carregados:**
   - Users cache (por organizationId)
   - Mais entidades podem ser adicionadas no futuro

## Performance

- **Problema Resolvido:** "Thundering herd" após restart
- **Impacto:** Primeiras requisições são 80-95% mais rápidas
- **Tempo de Warming:** ~500-2000ms (dependendo do volume)

## Troubleshooting

### Warming muito lento
- Verificar conexão com Redis
- Reduzir dados pré-carregados

### Warming falha
- Verificar logs: `grep "warm-cache" logs/`
- Verificar conexão com banco de dados

