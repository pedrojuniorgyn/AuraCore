# 🔄 REINICIAR NEXT.JS - PROBLEMA DE CACHE

## ❌ PROBLEMA IDENTIFICADO

O Turbopack está com **cache desatualizado** e não está recompilando o arquivo corrigido.

**Erro exibido (obsoleto):**
```
Export authOptions doesn't exist in target module
./aura_core/src/app/api/fleet/maintenance-plans/route.ts:3:1
```

**Arquivo já corrigido:**
```typescript
import { auth } from "@/lib/auth"; // ✅ CORRETO
```

---

## ✅ SOLUÇÃO: REINICIAR O SERVIDOR

### **OPÇÃO 1: Reinício Simples** (Recomendado)

1. No terminal onde o Next.js está rodando, pressione **Ctrl+C**
2. Execute novamente:

```bash
npm run dev
```

### **OPÇÃO 2: Reinício com Limpeza de Cache**

```bash
# Parar o servidor (Ctrl+C)
rm -rf .next
npm run dev
```

### **OPÇÃO 3: Reinício Completo**

```bash
# Parar o servidor (Ctrl+C)
rm -rf .next node_modules/.cache
npm run dev
```

---

## 🧪 DEPOIS DE REINICIAR, TESTAR:

```bash
# 1. Migração BTG
curl -X POST http://localhost:3000/api/admin/run-btg-migration

# 2. Health Check BTG
curl http://localhost:3000/api/btg/health

# 3. Testar Maintenance Plans (arquivo corrigido)
curl http://localhost:3000/api/fleet/maintenance-plans
```

---

## ⏳ AGUARDANDO REINÍCIO...

Após reiniciar, **TODOS os testes devem funcionar** e podemos prosseguir com a implementação BTG!





