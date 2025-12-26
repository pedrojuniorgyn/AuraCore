# ✅ CHECKLIST DE QUALIDADE - AURA CORE

Use este checklist ANTES de commitar código novo ou refatorado.

---

## 📋 CHECKLIST GERAL (TODO CÓDIGO)

### TypeScript
- [ ] ✅ Zero erros de TypeScript (`npm run typecheck`)
- [ ] ✅ Sem uso de `any` (buscar: `grep -r "any" src/`)
- [ ] ✅ Tipos explícitos em funções públicas
- [ ] ✅ Interfaces documentadas com JSDoc quando necessário

### Validação
- [ ] ✅ Input de API validado com Zod
- [ ] ✅ Parâmetros de função validados
- [ ] ✅ Erros retornam mensagens claras (não técnicas)

### Segurança
- [ ] ✅ Multi-tenancy aplicado (`organizationId` em queries)
- [ ] ✅ Branch scoping validado (`resolveBranchIdOrThrow`)
- [ ] ✅ Sem SQL injection (sempre usar parametrizado)
- [ ] ✅ Logs não expõem dados sensíveis

### Performance
- [ ] ✅ Sem N+1 queries (usar JOIN quando possível)
- [ ] ✅ Índices definidos para queries frequentes
- [ ] ✅ Paginação implementada para listas grandes

---

## 📋 CHECKLIST DDD (CÓDIGO DE DOMÍNIO)

### Entidades
- [ ] ✅ Construtor privado + método `create()` estático
- [ ] ✅ Validações no método `create()`
- [ ] ✅ Retorna `Result<T>` em operações que podem falhar
- [ ] ✅ Métodos de negócio (não setters públicos)
- [ ] ✅ Eventos de domínio emitidos em mudanças de estado

### Value Objects
- [ ] ✅ Imutável (readonly properties)
- [ ] ✅ Validação no constructor
- [ ] ✅ Método `equals()` para comparação
- [ ] ✅ Método `toString()` ou `format()` quando aplicável

### Use Cases
- [ ] ✅ Uma responsabilidade (Single Responsibility)
- [ ] ✅ Usa transação se modifica múltiplas agregações
- [ ] ✅ Retorna `Result<T>`
- [ ] ✅ Publica eventos de domínio

### Repositories
- [ ] ✅ Interface no domínio, implementação na infra
- [ ] ✅ Métodos retornam entidades de domínio, não DTOs
- [ ] ✅ Usa mapper para conversão (domain ↔ persistence)

---

## 📋 CHECKLIST FISCAL/FINANCEIRO (CRÍTICO)

### Cálculos
- [ ] ✅ Usa `decimal` para valores monetários (nunca `float`)
- [ ] ✅ Arredondamento correto (2 casas decimais)
- [ ] ✅ Validações de limites (valores positivos, datas futuras, etc)

### Impostos
- [ ] ✅ ICMS calculado conforme UF origem/destino
- [ ] ✅ PIS/COFINS considera regime tributário
- [ ] ✅ Créditos fiscais registrados quando aplicável

### NFe/CTe
- [ ] ✅ XML validado contra schema Sefaz
- [ ] ✅ Assinatura digital aplicada
- [ ] ✅ Chave de acesso gerada corretamente (44 dígitos)
- [ ] ✅ Status Sefaz rastreado (autorizado, rejeitado, etc)

### Transações Financeiras
- [ ] ✅ Usa transação SQL (tudo ou nada)
- [ ] ✅ Auditoria completa (quem, quando, o quê)
- [ ] ✅ Conciliação bancária rastreável
- [ ] ✅ Não permite duplicidade (idempotência)

---

## 📋 CHECKLIST DE TESTES

### Cobertura Mínima
- [ ] ✅ Entidades: 80%+
- [ ] ✅ Use Cases: 70%+
- [ ] ✅ Value Objects: 90%+
- [ ] ✅ Regras fiscais: 100%

### Tipos de Teste
- [ ] ✅ Unitários para lógica de domínio
- [ ] ✅ Integração para repositórios
- [ ] ✅ E2E para fluxos críticos (fiscal, financeiro)

### Casos de Teste Obrigatórios
- [ ] ✅ Casos de sucesso (happy path)
- [ ] ✅ Casos de erro (validações)
- [ ] ✅ Casos de borda (limites, nulls, vazios)

---

## 📋 CHECKLIST DE DOCUMENTAÇÃO

### Código
- [ ] ✅ Regras de negócio documentadas com JSDoc
- [ ] ✅ Invariantes de domínio explicados
- [ ] ✅ Exemplos de uso em comentários

### Arquitetura
- [ ] ✅ ADR criado para decisões importantes
- [ ] ✅ Diagrama atualizado se mudou fluxo
- [ ] ✅ Contrato atualizado se mudou API

### README
- [ ] ✅ Como rodar localmente
- [ ] ✅ Como rodar testes
- [ ] ✅ Variáveis de ambiente documentadas

---

## 🚀 ANTES DE FAZER PULL REQUEST

- [ ] ✅ `npm run typecheck` passa sem erros
- [ ] ✅ `npm run lint` passa sem erros
- [ ] ✅ `npm run test` passa com 70%+ cobertura
- [ ] ✅ `npm run build` completa com sucesso
- [ ] ✅ Testado localmente com dados reais
- [ ] ✅ Checklist de qualidade revisado
- [ ] ✅ Código revisado por outra pessoa (se possível)

---

## 📊 MÉTRICAS DE QUALIDADE (METAS)

| Métrica | Meta | Atual | Status |
|---------|------|-------|--------|
| TypeScript Errors | 0 | TBD | 🔴 |
| Test Coverage | 70% | 0% | 🔴 |
| Lint Warnings | <10 | TBD | 🟡 |
| Build Time | <5min | TBD | 🟡 |
| API Response Time (p95) | <500ms | TBD | 🟡 |

---

## 🎯 COMO USAR ESTE CHECKLIST

1. **Antes de começar:** Leia o checklist relevante
2. **Durante desenvolvimento:** Marque itens conforme avança
3. **Antes de commit:** Revise todos os itens marcados
4. **Em code review:** Validar checklist foi seguido