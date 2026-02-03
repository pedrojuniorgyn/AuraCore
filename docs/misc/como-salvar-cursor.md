# 🛡️ GUIA: Como Salvar e Fechar o Cursor com Segurança

**Data:** 13/12/2025  
**Objetivo:** Evitar travamentos e perda de dados

---

## ✅ PASSO A PASSO PARA SALVAR TUDO

### **1. Salvar Arquivos Abertos (Ctrl+S / Cmd+S)**

```
⌨️ Atalho no Mac: Cmd + S
⌨️ Atalho no Windows: Ctrl + S
```

**Verificar:**
- ✅ Nenhum arquivo com "●" (bolinha) ao lado do nome
- ✅ Todos os arquivos salvos mostram o nome sem indicador

---

### **2. Verificar Git Status**

Abra o terminal no Cursor (`` Ctrl+` `` ou `View > Terminal`) e execute:

```bash
cd /Users/pedrolemes/aura_core
git status
```

**Você verá:**
```
Changes not staged for commit:
  modified:   src/app/api/pcg-ncm-rules/route.ts
```

---

### **3. Fazer Commit das Correções**

```bash
# Adicionar arquivos modificados
git add src/app/api/pcg-ncm-rules/route.ts

# Criar commit
git commit -m "fix: Corrigir await em getTenantContext e remover check duplicado

- Adicionar tratamento para getTenantContext async
- Remover verificação duplicada antes do INSERT
- Deixar constraint do banco tratar duplicatas
- Melhorar tratamento de erros

Fixes: Agent Review issues"
```

---

### **4. Enviar para GitHub (OPCIONAL)**

Se quiser sincronizar agora:

```bash
git push origin main
```

**OU** deixar para sincronizar depois (mais rápido):

```bash
# Pular este passo, fazer depois
```

---

## 🚨 ANTES DE FECHAR O CURSOR

### **Checklist de Segurança:**

- [ ] **1. Salvar todos os arquivos** (Cmd+S em cada aba aberta)
- [ ] **2. Fazer commit local** (não precisa push imediato)
- [ ] **3. Parar o servidor dev** (Ctrl+C no terminal onde roda `npm run dev`)
- [ ] **4. Fechar terminais ativos** (clicar no X de cada terminal)
- [ ] **5. Verificar se não há processos pesados rodando**

---

## 🔧 COMANDOS PARA FECHAR COM SEGURANÇA

### **1. Parar o Servidor Dev:**

No terminal onde está rodando `npm run dev`, pressione:

```bash
Ctrl + C
```

Aguarde a mensagem de confirmação:
```
✓ Compiled successfully
^C
$
```

---

### **2. Verificar se não há processos rodando:**

```bash
# Ver processos Node.js ativos
ps aux | grep node

# Se tiver processos travados, mate-os:
# pkill -f "node"
```

---

### **3. Commit Rápido (Sem Push):**

```bash
# Salvar localmente (30 segundos)
git add -A
git commit -m "save: Trabalho do dia 12-13/12/2025"
```

**Você NÃO precisa fazer `git push` agora!** Isso pode travar se a internet estiver lenta.

---

## 🚀 FECHAMENTO SEGURO DO CURSOR

### **Opção 1: Fechamento Normal (Recomendado)**

```
1. Cmd + Q (Mac) ou Alt + F4 (Windows)
2. Se perguntar "Save changes?", clique "Save All"
3. Aguarde 5-10 segundos
4. Cursor fecha normalmente
```

---

### **Opção 2: Fechamento Forçado (Se Travar)**

**Mac:**
```
1. Cmd + Option + Esc
2. Selecionar "Cursor"
3. Clicar "Force Quit"
```

**Windows:**
```
1. Ctrl + Shift + Esc (Task Manager)
2. Selecionar "Cursor"
3. Clicar "End Task"
```

---

## 📋 SCRIPT COMPLETO (COPIE E COLE)

Para salvar tudo de uma vez, copie e cole no terminal:

```bash
cd /Users/pedrolemes/aura_core

# 1. Ver status
echo "📊 Verificando status..."
git status

# 2. Adicionar tudo
echo "➕ Adicionando arquivos..."
git add -A

# 3. Commit local
echo "💾 Salvando localmente..."
git commit -m "save: Correções Agent Review + trabalho do dia"

# 4. Confirmação
echo ""
echo "✅ TUDO SALVO LOCALMENTE!"
echo "✅ Você pode fechar o Cursor com segurança"
echo ""
echo "💡 Para enviar ao GitHub depois, execute:"
echo "   git push origin main"
echo ""
```

---

## ⚡ REABRINDO O CURSOR AMANHÃ

### **Quando reabrir o Cursor:**

```bash
# 1. Navegar para o projeto
cd /Users/pedrolemes/aura_core

# 2. Verificar status
git status

# 3. Se tiver commits locais, enviar ao GitHub
git push origin main

# 4. Iniciar servidor
npm run dev
```

---

## 🛡️ PROTEÇÃO CONTRA TRAVAMENTOS

### **Configurações Recomendadas:**

1. **Auto Save:**
   - `File > Preferences > Settings`
   - Buscar: `Auto Save`
   - Configurar: `afterDelay` (salva a cada 1 segundo)

2. **Git Auto Fetch:**
   - Desabilitar se internet estiver lenta
   - `Settings > Git > Auto Fetch: false`

3. **Terminal:**
   - Sempre fechar terminais antes de fechar o Cursor
   - `Terminal > Kill All Terminals`

---

## 🆘 SE O CURSOR TRAVAR

### **Não entre em pânico!**

1. **Seus arquivos estão salvos** se você fez commit
2. **O Git guarda tudo** mesmo se o Cursor fechar incorretamente
3. **Último commit está seguro** em `.git/`

### **Para recuperar:**

```bash
# Ver último commit
git log -1

# Ver arquivos do último commit
git show --name-only

# Restaurar arquivo específico
git checkout HEAD -- caminho/do/arquivo
```

---

## 📝 RESUMO (TL;DR)

```bash
# 1️⃣ Salvar tudo
Cmd + S (em cada arquivo aberto)

# 2️⃣ Commit local
git add -A && git commit -m "save: trabalho do dia"

# 3️⃣ Parar servidor
Ctrl + C (no terminal do npm run dev)

# 4️⃣ Fechar Cursor
Cmd + Q (aguardar 10 segundos)
```

**✅ PRONTO! Você pode fechar com segurança.**

---

## 🔐 GARANTIA

Se você executou:
```bash
git commit -m "mensagem"
```

**Seus arquivos estão 100% seguros!** Mesmo que:
- ❌ O Cursor trave
- ❌ A luz acabe
- ❌ O computador reinicie

O Git guarda tudo em `.git/` localmente.

---

**Última atualização:** 13/12/2025  
**Status:** Pronto para fechar com segurança




