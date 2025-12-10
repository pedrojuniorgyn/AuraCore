# 📋 **COLUNA "PARCEIRO" - EXPLICAÇÃO E SOLUÇÃO**

## **❓ O que é a coluna "Parceiro"?**

### **Contexto de NFe de Entrada (Compras):**
- **Parceiro = FORNECEDOR** (emitente da NFe)
- É a empresa que **vendeu** para você e **emitiu** a nota fiscal
- Exemplo: Se você comprou combustível da Petrobrás, o "Parceiro" é "PETROLEO BRASILEIRO SA"

### **Contexto de CTe/NFe de Saída (Vendas):**
- **Parceiro = CLIENTE** (destinatário)
- É a empresa que **comprou** de você e está **recebendo** a mercadoria/serviço

---

## **🔍 Por que está em branco?**

As NFes foram importadas para a tabela `inbound_invoices`, mas quando criamos a nova estrutura `fiscal_documents`, a migração:

✅ Migrou o `partner_id` (ID do parceiro)  
❌ **NÃO** migrou o `partner_name` (Nome do parceiro)  
❌ **NÃO** migrou o `partner_document` (CNPJ do parceiro)

---

## **✅ SOLUÇÃO RÁPIDA**

### **Opção A: Extrair dos XMLs (Mais completo)**
Os XMLs armazenados contêm o nome do emitente. Basta parse-ar e popular.

**Status:** Script criado mas precisa de ajustes (XMLs podem não estar em `fiscal_documents`)

### **Opção B: Popular da tabela antiga `inbound_invoices` (Mais rápido)**
A tabela `inbound_invoices` tem relação com `business_partners` via `partner_id`.

**SQL:**
```sql
UPDATE fd
SET 
  fd.partner_name = bp.name,
  fd.partner_document = bp.document
FROM fiscal_documents fd
INNER JOIN inbound_invoices ii ON fd.access_key = ii.access_key
INNER JOIN business_partners bp ON ii.partner_id = bp.id
WHERE fd.document_type = 'NFE'
  AND (fd.partner_name IS NULL OR fd.partner_name = '');
```

---

## **🎯 RECOMENDAÇÃO**

Use a **Opção B** agora para resolver rapidamente, depois implemente a Opção A para futuras importações automáticas.

---

## **📊 IMPACTO**

Sem o nome do parceiro:
- ❌ Grid fica vazio
- ❌ Filtros não funcionam
- ❌ Relatórios ficam incompletos
- ❌ Impossível identificar fornecedores visualmente

Com o nome do parceiro:
- ✅ Grid completo e profissional
- ✅ Filtros funcionam
- ✅ Relatórios corretos
- ✅ Fácil identificação visual

---

**Vou executar a Opção B agora!**




