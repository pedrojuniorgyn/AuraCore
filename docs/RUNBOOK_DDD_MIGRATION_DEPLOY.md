# RUNBOOK: Deploy DDD Migration Financial/Fiscal

**Versão:** 1.0.0  
**Data:** 2026-02-08  
**Autor:** AuraCore Team  

---

## Pré-requisitos

- [ ] Todos os testes passando (`npm test -- --run`)
- [ ] TypeScript sem erros novos (`npx tsc --noEmit`)
- [ ] Smoke tests local passando
- [ ] Backup do banco de produção realizado
- [ ] Certificado SEFAZ A1 configurado (homolog/prod)

## Resumo das Mudanças

### O que mudou
1. **Schemas DDD criados**: 8 arquivos (4 Financial, 4 Fiscal)
2. **Repositories DDD criados**: 7 (4 Financial, 3 Fiscal)
3. **Rotas V1 migradas**: 25 rotas Financial + 12 rotas Fiscal (imports atualizados)
4. **Rotas V2 Financial removidas**: 10 rotas
5. **Services deprecados removidos**: 6 arquivos
6. **Dashboard atualizado**: URLs V2 → V1

### O que NÃO mudou
- Nenhuma lógica de negócio alterada
- Nenhuma query SQL alterada
- Nenhuma migration de banco necessária
- Schemas legados mantidos em schema.ts (com `@deprecated`)

## Procedimento de Deploy

### 1. Deploy em Homologação

```bash
# 1.1 Build
npm run build

# 1.2 Deploy para homolog (Coolify)
git push origin main  # ou branch específica

# 1.3 Verificar logs
coolify logs --service auracore-homolog --tail 50

# 1.4 Smoke tests
./scripts/smoke-test-ddd-migration.sh https://homolog.auracore.com.br
```

### 2. Validação em Homologação

```
Checklist:
- [ ] Todas as rotas Financial retornam 200
- [ ] Todas as rotas Fiscal retornam 200
- [ ] Dashboard carrega sem erros
- [ ] Rotas V2 retornam 404
- [ ] Criar CTe de teste
- [ ] Criar Conta a Pagar de teste
- [ ] Criar Conta a Receber de teste
- [ ] Gerar relatório DRE
- [ ] Gerar cash flow
```

### 3. Deploy em Produção

```bash
# 3.1 Confirmar backup
# RPO: 1h, RTO: 4h

# 3.2 Deploy
git tag v2.0.0-ddd-migration
git push origin v2.0.0-ddd-migration

# 3.3 Smoke tests produção
./scripts/smoke-test-ddd-migration.sh https://erp.empresa.com.br

# 3.4 Monitorar por 30 min
# - Verificar logs de erro
# - Verificar latência das rotas
# - Verificar dashboard funcional
```

## Rollback

### Se falhar em homologação
```bash
# Reverter para commit anterior
git revert HEAD
git push origin main
```

### Se falhar em produção
```bash
# 1. Reverter deploy
git tag v2.0.0-rollback
git push origin v2.0.0-rollback

# 2. Restaurar backup se necessário (banco não mudou neste deploy)
# Nota: Este deploy NÃO altera o banco de dados,
# apenas imports de código. Rollback é seguro sem restore de DB.
```

## Monitoramento Pós-Deploy

### Primeiras 24h
- [ ] Verificar taxa de erro 500 (deve ser 0%)
- [ ] Verificar latência p95 < 500ms
- [ ] Verificar que todas as operações CRUD funcionam
- [ ] Verificar que CTe/NFe continuam autorizando na SEFAZ

### Primeira semana
- [ ] Verificar relatórios DRE com dados reais
- [ ] Verificar cash flow com dados reais
- [ ] Verificar billing com dados reais
- [ ] Confirmar que nenhum usuário reportou problemas

## Contatos

| Papel | Contato |
|-------|---------|
| Tech Lead | [Nome] |
| DBA | [Nome] |
| DevOps | [Nome] |
| Suporte N1 | [Nome] |

---

**IMPORTANTE**: Este deploy é de baixo risco. Apenas imports de código foram alterados.
Nenhuma lógica de negócio ou query SQL foi modificada. O banco de dados não é afetado.
