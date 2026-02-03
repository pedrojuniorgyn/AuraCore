# 🐛 BRANCH SWITCHER - GUIA DE DEBUG

**Bug:** BUG-030 - Dropdown abre mas não troca de filial  
**Data:** 03/02/2026  
**Status:** 🔍 Logs adicionados para debug

---

## 📋 MUDANÇAS REALIZADAS

Adicionados logs detalhados em 3 componentes:

### 1. `src/components/layout/branch-switcher.tsx`
- ✅ Log quando `handleBranchSwitch` é chamado
- ✅ Log do branchId atual vs. novo
- ✅ Log quando fecha popover sem trocar (mesma filial)
- ✅ Log de invalidação do cache Refine
- ✅ Log de conclusão do `switchBranch`

### 2. `src/contexts/tenant-context.tsx`

**Função `persistBranchCookie`:**
- ✅ Log de sucesso (200 OK)
- ✅ Log de erro HTTP (403, 404, 500)
- ✅ Log de exceção (network error)
- ✅ Retorna `true/false` para indicar sucesso

**Função `switchBranch`:**
- ✅ Log quando é chamada
- ✅ Log dos dados do usuário (role, allowedBranches)
- ✅ Log de validação de permissão
- ✅ Log de busca da filial
- ✅ Log de atualização do estado local
- ✅ Log de persistência do cookie
- ✅ Log do `router.refresh()`

---

## 🧪 COMO TESTAR

### Passo 1: Iniciar servidor dev
```bash
cd ~/aura_core
npm run dev
```

### Passo 2: Abrir DevTools
1. Abrir navegador em `http://localhost:3000`
2. Fazer login
3. Abrir DevTools (F12)
4. Ir na aba **Console**

### Passo 3: Testar troca de filial
1. Clicar no **BranchSwitcher** (sidebar ou header)
2. Clicar em **outra filial** diferente da atual
3. **Observar logs no console**

---

## 📊 LOGS ESPERADOS (SUCESSO)

Se tudo funcionar, você verá esta sequência no console:

```
[DEBUG] handleBranchSwitch called: 2 current: 1
[DEBUG] Invalidating Refine cache
[DEBUG] Calling switchBranch
[DEBUG] switchBranch called: 2
[DEBUG] User: { id: "...", role: "ADMIN", allowedBranches: [1, 2, 3] }
[DEBUG] Trocando para filial: { id: 2, name: "Filial Centro" }
[DEBUG] Estado local e localStorage atualizados
✅ Cookie de filial persistido com sucesso: 2
[DEBUG] Cookie persistido: true
[DEBUG] Chamando router.refresh()
[DEBUG] switchBranch completed
```

**Resultado esperado:**
- ✅ Toast "Filial alterada: Filial Centro"
- ✅ Página recarrega
- ✅ Dados da nova filial são exibidos

---

## 🚨 LOGS DE ERRO POSSÍVEIS

### Erro 1: Permissão negada
```
❌ switchBranch: sem permissão para filial 2
```
**Causa:** Usuário não tem acesso à filial  
**Solução:** Adicionar filial ao `allowedBranches` do usuário

### Erro 2: API retorna 403
```
❌ Erro ao persistir cookie de filial: { status: 403, error: { code: "BRANCH_FORBIDDEN" } }
```
**Causa:** Backend nega acesso à filial  
**Solução:** Verificar `hasAccessToBranch()` em `/api/tenant/branch`

### Erro 3: API retorna 404
```
❌ Erro ao persistir cookie de filial: { status: 404, error: "Filial não encontrada" }
```
**Causa:** Filial não existe no banco ou foi deletada  
**Solução:** Verificar `branches` table

### Erro 4: Network error
```
❌ Exceção ao persistir cookie de filial: TypeError: Failed to fetch
```
**Causa:** Servidor dev não está rodando ou erro de rede  
**Solução:** Verificar `npm run dev` está ativo

### Erro 5: Filial não encontrada no contexto
```
❌ switchBranch: filial não encontrada 2
```
**Causa:** `availableBranches` não inclui a filial  
**Solução:** Verificar `/api/branches` retorna a filial

---

## 🔍 DIAGNÓSTICO POR SINTOMA

### Sintoma: Dropdown abre mas não fecha ao clicar
**Possível causa:** `handleBranchSwitch` não está sendo chamado  
**O que verificar:**
- Logs mostram `[DEBUG] handleBranchSwitch called`?
- Se NÃO: Problema no `onSelect` do `CommandItem`
- Se SIM: Continuar investigação

### Sintoma: Fecha mas não muda visualmente
**Possível causa:** `switchBranch` não atualiza estado  
**O que verificar:**
- Logs mostram `[DEBUG] Estado local e localStorage atualizados`?
- Se SIM: Problema no `router.refresh()` ou re-render
- Se NÃO: Problema antes da atualização do estado

### Sintoma: Muda visualmente mas dados não atualizam
**Possível causa:** Cookie não está sendo persistido  
**O que verificar:**
- Logs mostram `✅ Cookie de filial persistido com sucesso`?
- Se NÃO: Ver erro HTTP (403, 404, 500)
- Se SIM: Problema no middleware ou queries do backend

### Sintoma: Nenhum log aparece
**Possível causa:** Build antigo em cache  
**Solução:**
```bash
# Limpar cache Next.js
rm -rf .next
npm run dev
```

---

## 🧩 CHECKLIST DE VALIDAÇÃO

Marcar o que funciona:

- [ ] Logs aparecem no console ao clicar na filial
- [ ] `handleBranchSwitch` é chamado
- [ ] `switchBranch` é chamado
- [ ] Validação de permissão passa
- [ ] Estado local é atualizado
- [ ] Cookie é persistido (200 OK)
- [ ] `router.refresh()` é chamado
- [ ] Toast de sucesso aparece
- [ ] Página recarrega
- [ ] Dados da nova filial são exibidos
- [ ] BranchSwitcher mostra filial correta após reload

---

## 📝 RELATÓRIO PARA O DESENVOLVEDOR

Após testar, preencher:

**1. Qual sintoma você observou?**
- [ ] Dropdown não abre
- [ ] Abre mas não fecha ao clicar
- [ ] Fecha mas não muda visualmente
- [ ] Muda visualmente mas dados não atualizam
- [ ] Outro: _______________

**2. Quais logs apareceram? (copiar do console)**
```
[Colar logs aqui]
```

**3. Houve erro HTTP na API /api/tenant/branch?**
- [ ] Sim: Status _____ Erro: _____
- [ ] Não

**4. O toast "Filial alterada" apareceu?**
- [ ] Sim
- [ ] Não

**5. A página recarregou após clicar?**
- [ ] Sim
- [ ] Não

---

## 🔧 PRÓXIMOS PASSOS APÓS DIAGNÓSTICO

Com base nos logs, identificar:

1. **Se `handleBranchSwitch` não é chamado:**
   - Verificar `onSelect` do `CommandItem` no BranchSwitcher
   - Verificar se há erro no React ao renderizar

2. **Se permissão falha:**
   - Verificar `user.allowedBranches` no banco
   - Verificar `user_branches` table
   - Adicionar filial faltante

3. **Se API retorna erro:**
   - Ler `/api/tenant/branch/route.ts`
   - Verificar `hasAccessToBranch()` em `lib/auth/context`
   - Verificar se filial existe no banco

4. **Se cookie não persiste:**
   - Verificar middleware em `middleware.ts`
   - Verificar `BRANCH_COOKIE_NAME` em `lib/tenant/branch-cookie`

5. **Se router.refresh() não funciona:**
   - Verificar se está em Client Component
   - Verificar se há erro no React
   - Tentar forçar reload com `window.location.reload()` (temporário)

---

**Gerado por:** Claude Sonnet 4.5  
**Task:** TASK 02 - Fix Branch Switcher  
**Versão dos logs:** 1.0.0
