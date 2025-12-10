# 🔍 VERIFICAÇÃO AMBIENTE SEFAZ - RELATÓRIO

## ⚠️ **PROBLEMA DETECTADO: INCONSISTÊNCIA DE AMBIENTE**

### 📊 **STATUS ATUAL:**

| Filial | Tabela | Valor Atual | tpAmb |
|--------|--------|-------------|-------|
| #1 - TCL Transporte | `branches.environment` | **PRODUCTION** ❌ | 1 (REAL) |
| #1 - TCL Transporte | `fiscal_settings.nfeEnvironment` | **homologacao** ✅ | 2 (TESTE) |

---

## 🚨 **CAUSA DO PROBLEMA:**

O serviço de download da SEFAZ (`sefaz-service.ts`) está usando o campo **`branches.environment`** do banco de dados, e **NÃO** o campo `fiscal_settings.nfeEnvironment`.

**Código relevante:**
```typescript:src/services/sefaz-service.ts
// Linha 76 - getCertificate()
return {
  pfx: pfxBuffer,
  password: branch.certificatePassword,
  lastNsu: branch.lastNsu || "0",
  environment: branch.environment || "HOMOLOGATION", // ❌ Está em PRODUCTION!
  cnpj: branch.document.replace(/\D/g, ""),
  uf: branch.state || "GO",
};

// Linha 107 - buildDistribuicaoEnvelope()
const tpAmb = environment === "PRODUCTION" ? "1" : "2"; // ❌ tpAmb=1 (PRODUÇÃO)

// Linha 168 - getDistribuicaoDFe()
const url = cert.environment === "PRODUCTION" 
  ? SEFAZ_URLS.PRODUCTION  // ❌ Usando URL de PRODUÇÃO!
  : SEFAZ_URLS.HOMOLOGATION;
```

---

## 🛠️ **SOLUÇÃO:**

### **OPÇÃO A: Atualizar tabela `branches` (RÁPIDO)** ✅ RECOMENDADO

```sql
UPDATE branches 
SET environment = 'HOMOLOGATION' 
WHERE id = 1;
```

**Vantagem:** Correção imediata, sem mudança de código.

---

### **OPÇÃO B: Refatorar código para usar `fiscal_settings`** (LONGO PRAZO)

Modificar `sefaz-service.ts` para buscar ambiente de `fiscal_settings` em vez de `branches`.

**Vantagem:** Consistência com a interface de configurações.  
**Desvantagem:** Requer refatoração e testes.

---

## 🧪 **COMO CONFIRMAR SE ESTÁ EM HOMOLOGAÇÃO:**

Após aplicar a correção, verificar nos logs:

```bash
# Durante a importação, deve aparecer:
🌐 Ambiente: HOMOLOGATION
📡 URL Sefaz: https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx

# E no envelope SOAP:
<tpAmb>2</tpAmb>  <!-- 2 = Homologação ✅ -->
```

---

## 📋 **CHECKLIST PÓS-CORREÇÃO:**

- [ ] Campo `branches.environment` = "HOMOLOGATION"
- [ ] Logs mostram "Ambiente: HOMOLOGATION"
- [ ] URL Sefaz é `hom1.nfe.fazenda.gov.br`
- [ ] Envelope SOAP tem `<tpAmb>2</tpAmb>`
- [ ] Testar importação manual de XML

---

## 🎯 **PRÓXIMOS PASSOS:**

1. Aplicar **Opção A** (UPDATE no banco)
2. Reiniciar servidor Next.js
3. Testar upload de XML novamente
4. Verificar logs para confirmar ambiente HOMOLOGATION

---

**Gerado em:** ${new Date().toLocaleString('pt-BR')}




