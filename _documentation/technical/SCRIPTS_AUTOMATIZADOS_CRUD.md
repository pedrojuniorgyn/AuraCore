# 🤖 SCRIPTS AUTOMATIZADOS - IMPLEMENTAÇÃO CRUD

**Data:** 10/12/2025  
**Status:** ✅ **2 SCRIPTS PRONTOS PARA EXECUTAR**

---

## 🎯 OBJETIVO

Implementar CRUD (Edit/Delete) nas **19 telas restantes** de forma AUTOMÁTICA e RÁPIDA!

---

## 📦 O QUE FOI CRIADO

### **1. Script Principal - `implementar-crud-19-telas.sh`**
- ✅ Adiciona imports necessários
- ✅ Adiciona handlers (handleEdit + handleDelete)
- ✅ Configura routers
- ✅ Cria backups automáticos
- ✅ Processa 19 telas automaticamente

### **2. Script Auxiliar - `adicionar-colunas-acoes.sh`**
- ✅ Mostra template da coluna de ações
- ✅ Lista arquivos para editar
- ✅ Dá instruções de onde adicionar
- ✅ Exemplos práticos

---

## 🚀 COMO USAR

### **PASSO 1: Executar Script Principal**

```bash
# 1. Navegar para pasta do projeto
cd /Users/pedrolemes/aura_core

# 2. Executar script
./implementar-crud-19-telas.sh

# Saída esperada:
# 🚀 INICIANDO IMPLEMENTAÇÃO DAS 19 TELAS...
# [1/19] 📝 Implementando: remessas...
# [2/19] 📝 Implementando: cotacoes...
# ...
# ✅ IMPLEMENTAÇÃO CONCLUÍDA!
```

**O script vai:**
- ✅ Adicionar `Edit`, `Trash2` nos imports
- ✅ Adicionar `useRouter` e `toast`
- ✅ Criar handlers `handleEdit` e `handleDelete`
- ✅ Criar backups (.backup) de segurança

---

### **PASSO 2: Adicionar Colunas de Ações**

```bash
# Ver instruções
./adicionar-colunas-acoes.sh
```

**Você precisa (5-10min por tela):**

1. Abrir cada arquivo listado
2. Procurar `columnDefs`
3. Adicionar coluna de ações NO FINAL

**Template da coluna:**

```typescript
{
  headerName: "Ações",
  width: 120,
  pinned: "right",
  sortable: false,
  filter: false,
  cellRenderer: (params: any) => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={() => handleEdit(params.data)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleDelete(params.data.id)}>
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  ),
},
```

**Adicionar ANTES do fechamento `], [])` ou `], [handleEdit, handleDelete])`**

---

### **PASSO 3: Verificar e Testar**

```bash
# 1. Iniciar servidor
npm run dev

# 2. Testar cada tela:
# - Verificar se botões aparecem
# - Clicar em "Editar" (deve navegar)
# - Clicar em "Excluir" (deve confirmar e excluir)

# 3. Se algo der errado, restaurar backup:
find src -name '*.backup' -exec sh -c 'mv "$1" "${1%.backup}"' _ {} \;
```

---

## 📋 19 TELAS PROCESSADAS

| # | Tela | API | Status Script |
|---|------|-----|---------------|
| 1 | `/financeiro/remessas` | `/api/financial/remittances/[id]` | ✅ |
| 2 | `/comercial/cotacoes` | `/api/commercial/quotes/[id]` | ✅ |
| 3 | `/comercial/tabelas-frete` | `/api/commercial/freight-tables/[id]` | ✅ |
| 4 | `/tms/repositorio-cargas` | `/api/tms/cargo-repository/[id]` | ✅ |
| 5 | `/tms/ocorrencias` | `/api/tms/occurrences/[id]` | ✅ |
| 6 | `/cadastros/parceiros` | `/api/partners/[id]` | ✅ |
| 7 | `/cadastros/produtos` | `/api/products/[id]` | ✅ |
| 8 | `/cadastros/filiais` | `/api/branches/[id]` | ✅ |
| 9 | `/fiscal/documentos` | `/api/fiscal/documents/[id]` | ✅ |
| 10 | `/fiscal/cte` | `/api/fiscal/cte/[id]` | ✅ |
| 11 | `/fiscal/matriz-tributaria` | `/api/fiscal/tax-matrix/[id]` | ✅ |
| 12 | `/fiscal/ncm-categorias` | `/api/fiscal/ncm-categories/[id]` | ✅ |
| 13 | `/fiscal/ciap` | `/api/ciap/[id]` | ✅ |
| 14 | `/wms/faturamento` | `/api/financial/billing/[id]` | ✅ |
| 15 | `/configuracoes/filiais` | `/api/branches/[id]` | ✅ |
| 16 | `/frota/documentacao` | `/api/fleet/documents/[id]` | ✅ |
| 17 | `/rh/motoristas/jornadas` | `/api/hr/driver-journey/[id]` | ✅ |
| 18 | `/sustentabilidade/carbono` | `/api/esg/emissions/[id]` | ✅ |
| 19 | `/frota/pneus` | `/api/fleet/tires/[id]` | ✅ |

---

## ⏱️ TEMPO ESTIMADO

| Etapa | Tempo | Automático? |
|-------|-------|-------------|
| **Script 1 - Handlers** | 1 min | ✅ Automático |
| **Script 2 - Colunas** | 90-120 min | ⚠️ Manual (5-10min/tela) |
| **Testar** | 30 min | ⚠️ Manual |
| **TOTAL** | ~2-2.5h | 50% automático |

---

## 🔄 REVERTER (Se necessário)

```bash
# Restaurar todos os backups
find src -name '*.backup' -exec sh -c 'mv "$1" "${1%.backup}"' _ {} \;

# Remover backups após confirmar que tudo funciona
find src -name '*.backup' -delete
```

---

## ✅ CHECKLIST

### **Executar Scripts:**
- [ ] `./implementar-crud-19-telas.sh` executado
- [ ] Verificar saída: 19 telas processadas
- [ ] Verificar backups criados

### **Adicionar Colunas Manualmente (19 telas):**
- [ ] 1. Remessas
- [ ] 2. Cotações
- [ ] 3. Tabelas Frete
- [ ] 4. Repositório Cargas
- [ ] 5. Ocorrências
- [ ] 6. Parceiros
- [ ] 7. Produtos
- [ ] 8. Filiais (cadastros)
- [ ] 9. Documentos Fiscais
- [ ] 10. CTe
- [ ] 11. Matriz Tributária
- [ ] 12. NCM Categorias
- [ ] 13. CIAP
- [ ] 14. WMS Faturamento
- [ ] 15. Configurações Filiais
- [ ] 16. Documentação Frota
- [ ] 17. Jornadas
- [ ] 18. Carbono
- [ ] 19. Pneus

### **Testar:**
- [ ] Servidor iniciado (`npm run dev`)
- [ ] Botões aparecem nas telas
- [ ] Editar funciona
- [ ] Excluir funciona
- [ ] Toasts aparecem

### **Finalizar:**
- [ ] Remover backups: `find src -name '*.backup' -delete`
- [ ] Commit: `git add . && git commit -m "feat: CRUD completo em 19 telas"`

---

## 📊 RESULTADO FINAL

Após executar tudo:

- ✅ **23 APIs backend** funcionando
- ✅ **4 telas frontend** implementadas manualmente
- ✅ **19 telas frontend** implementadas via scripts
- ✅ **23/23 telas = 100% COMPLETO!**

---

## 💡 DICAS

1. **Execute Script 1 primeiro** (automático)
2. **Depois adicione colunas** (manual, mas rápido)
3. **Teste incrementalmente** (5 telas por vez)
4. **Mantenha backups** até confirmar que tudo funciona

---

## 🎉 CONCLUSÃO

**Scripts automatizam 50% do trabalho!**

- ✅ Handlers: 100% automático
- ⚠️ Colunas AG Grid: Manual (mas templated)
- ✅ Total: ~2h para completar 19 telas

**Muito mais rápido que fazer uma por uma!**

---

**Criado:** 10/12/2025  
**Local:** `/Users/pedrolemes/aura_core/`  
**Scripts:**
- `implementar-crud-19-telas.sh`
- `adicionar-colunas-acoes.sh`



















