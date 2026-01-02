# WMS Integration Tests

**Status:** 🚧 Work in Progress

## Sobre

Estes testes de integração foram criados na E7.8 WMS Semana 4 para testar fluxos completos com banco de dados real.

## Arquivos

- `locations.integration.test.ts` - Testes de CRUD de localizações
- `stock-flow.integration.test.ts` - Testes de fluxo de estoque (entry → exit → transfer)
- `inventory-count.integration.test.ts` - Testes de contagem de inventário
- `movements.integration.test.ts` - Testes de rastreamento de movimentações
- `multi-tenancy.integration.test.ts` - Testes de isolamento multi-tenant

## Requisitos

Para executar estes testes, é necessário:

1. **Docker com SQL Server rodando**
   ```bash
   docker-compose -f docker-compose.test.yml up -d
   ```

2. **Migrations executadas no banco de teste**
   ```bash
   npm run drizzle:migrate -- --database AuraCoreTest
   ```

3. **Dependências instaladas**
   ```bash
   npm install
   ```

## Execução

```bash
# Executar todos os testes de integração do WMS
npm test -- --run tests/integration/wms/

# Executar teste específico
npm test -- --run tests/integration/wms/locations.integration.test.ts
```

## Pendências

- [ ] Corrigir tipos TypeScript (ExecutionContext, Result types)
- [ ] Remover dependência `pg` (não usada, projeto usa MS SQL)
- [ ] Configurar seeds de dados de teste
- [ ] Adicionar rollback automático após cada teste
- [ ] Integrar com CI/CD

## Notas

- Os testes E2E (`tests/e2e/wms/`) usam mocks e **não** requerem banco de dados.
- Os testes de integração requerem banco real e são mais lentos.
- Para desenvolvimento rápido, use os testes E2E.
- Para validação completa antes de produção, use os testes de integração.

## Referências

- `docker-compose.test.yml` - Configuração do container SQL Server de teste
- `tests/helpers/integration-db.ts` - Helper para setup/teardown do banco

