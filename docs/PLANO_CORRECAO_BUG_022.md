# 🎯 PLANO DE CORREÇÃO: BUG-022 (who_type missing)

**Status:** 🔴 **CRÍTICO - BLOQUEANTE**  
**Impacto:** 100% do módulo Strategic inoperante  
**ETA Correção:** ~15 minutos

---

## ✅ PASSO 1: APLICAR HOTFIX IMEDIATO

### Opção A: Script Automatizado (RECOMENDADO)

```bash
cd /Users/pedrolemes/aura_core
./scripts/apply-hotfix-bug-022.sh
```

**O que faz:**
1. Conecta ao servidor 5.253.85.46 via SSH
2. Identifica container web
3. Adiciona coluna `who_type` (VARCHAR 20 NOT NULL DEFAULT 'USER')
4. Adiciona coluna `who_partner_id` (VARCHAR 36 NULL)
5. Altera `who_user_id` para nullable
6. Cria índices de performance
7. Valida aplicação

**Tempo estimado:** 2-3 minutos

---

### Opção B: Manual via SSH

```bash
# 1. Conectar ao servidor
ssh root@5.253.85.46

# 2. Identificar container
WEB_CONTAINER=$(docker ps --format '{{.Names}}' | grep "^web-")
echo "Container: $WEB_CONTAINER"

# 3. Executar migration
docker exec -i $WEB_CONTAINER node << 'NODESCRIPT'
const mssql = require('mssql');
const config = {
  server: 'sql',
  user: 'sa',
  password: process.env.DB_PASSWORD,
  database: 'AuraCore',
  options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
  const pool = await mssql.connect(config);
  
  // Adicionar who_type
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns 
                   WHERE object_id = OBJECT_ID('strategic_action_plan') 
                   AND name = 'who_type')
    BEGIN
        ALTER TABLE [strategic_action_plan]
        ADD [who_type] VARCHAR(20) NOT NULL DEFAULT 'USER';
        PRINT '✅ who_type adicionada';
    END
  `);
  
  // Adicionar who_partner_id
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns 
                   WHERE object_id = OBJECT_ID('strategic_action_plan') 
                   AND name = 'who_partner_id')
    BEGIN
        ALTER TABLE [strategic_action_plan]
        ADD [who_partner_id] VARCHAR(36) NULL;
        PRINT '✅ who_partner_id adicionada';
    END
  `);
  
  // Índices
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.indexes 
                   WHERE name = 'idx_action_plan_who_type' 
                   AND object_id = OBJECT_ID('strategic_action_plan'))
    BEGIN
        CREATE NONCLUSTERED INDEX idx_action_plan_who_type
        ON [strategic_action_plan](who_type)
        WHERE who_type IS NOT NULL AND deleted_at IS NULL;
        PRINT '✅ Índice criado';
    END
  `);
  
  // Validação
  const result = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'strategic_action_plan'
    AND COLUMN_NAME IN ('who_type', 'who_partner_id')
  `);
  
  console.log('Validação:', result.recordset);
  await pool.close();
})().catch(console.error);
NODESCRIPT

# 4. Sair do SSH
exit
```

---

## ✅ PASSO 2: VALIDAR CORREÇÃO

### Teste 1: Verificar Colunas Criadas

```bash
ssh root@5.253.85.46 'docker exec $(docker ps --format "{{.Names}}" | grep "^web-") node -e "
const mssql = require(\"mssql\");
const config = {
  server: \"sql\",
  user: \"sa\",
  password: process.env.DB_PASSWORD,
  database: \"AuraCore\",
  options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
  const pool = await mssql.connect(config);
  const result = await pool.request().query(\`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'strategic_action_plan'
    AND COLUMN_NAME LIKE 'who%'
    ORDER BY ORDINAL_POSITION
  \`);
  console.table(result.recordset);
  await pool.close();
})();
"'
```

**Resultado esperado:**
```
┌─────────────────┬───────────┬─────────────┐
│   COLUMN_NAME   │ DATA_TYPE │ IS_NULLABLE │
├─────────────────┼───────────┼─────────────┤
│ who             │ varchar   │ NO          │
│ who_user_id     │ varchar   │ YES         │
│ who_type        │ varchar   │ NO          │ ✅ DEVE EXISTIR
│ who_email       │ varchar   │ YES         │
│ who_partner_id  │ varchar   │ YES         │ ✅ DEVE EXISTIR
└─────────────────┴───────────┴─────────────┘
```

---

### Teste 2: Verificar Endpoints

```bash
# Dashboard
curl -s https://tcl.auracore.cloud/api/strategic/dashboard/data | jq -r '.success // "ERROR"'
# Esperado: "true" ou dados JSON

# Kanban
curl -s https://tcl.auracore.cloud/api/strategic/action-plans/kanban | jq -r '.success // "ERROR"'
# Esperado: "true" ou dados JSON

# Mapa Estratégico
curl -s https://tcl.auracore.cloud/api/strategic/map | jq -r '.success // "ERROR"'
# Esperado: "true" ou dados JSON
```

**Critério de sucesso:** Nenhum endpoint deve retornar HTTP 500

---

### Teste 3: Validar na Interface Web

Acessar manualmente e verificar ausência de erros:

1. **Dashboard:** https://tcl.auracore.cloud/strategic/dashboard
   - ✅ Deve carregar sem erro `Invalid column name 'who_type'`
   - ✅ Cards de resumo devem mostrar dados

2. **Mapa Estratégico:** https://tcl.auracore.cloud/strategic/map
   - ✅ Deve carregar sem erro 500
   - ✅ Mapa BSC deve renderizar

3. **Planos de Ação:** https://tcl.auracore.cloud/strategic/action-plans
   - ✅ Deve carregar sem erro 500
   - ✅ Kanban PDCA deve renderizar

4. **Criar Novo Goal:** https://tcl.auracore.cloud/strategic/goals/new
   - ✅ Formulário deve carregar
   - ✅ Dropdown de strategies deve popular

---

## ✅ PASSO 3: MONITORAR LOGS

```bash
# Ver logs em tempo real (deixar rodando em outra aba)
ssh root@5.253.85.46 'docker logs -f $(docker ps --format "{{.Names}}" | grep "^web-") 2>&1 | grep -i "who_type"'
```

**Esperado:** Nenhuma linha com erro `Invalid column name 'who_type'`

---

## 🔄 ROLLBACK (Se necessário)

```bash
# APENAS se o hotfix causar problemas

ssh root@5.253.85.46 << 'EOF'
docker exec -i $(docker ps --format "{{.Names}}" | grep "^web-") node << 'NODESCRIPT'
const mssql = require('mssql');
const config = {
  server: 'sql',
  user: 'sa',
  password: process.env.DB_PASSWORD,
  database: 'AuraCore',
  options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
  const pool = await mssql.connect(config);
  
  // Remover índices
  await pool.request().query(`
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_action_plan_who_type')
      DROP INDEX idx_action_plan_who_type ON strategic_action_plan;
  `);
  
  await pool.request().query(`
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_action_plan_who_partner')
      DROP INDEX idx_action_plan_who_partner ON strategic_action_plan;
  `);
  
  // Remover colunas (CUIDADO: perde dados!)
  await pool.request().query(`
    IF EXISTS (SELECT 1 FROM sys.columns 
               WHERE object_id = OBJECT_ID('strategic_action_plan') 
               AND name = 'who_partner_id')
      ALTER TABLE strategic_action_plan DROP COLUMN who_partner_id;
  `);
  
  // NÃO remove who_type (quebraria o código novamente)
  
  await pool.close();
  console.log('Rollback parcial aplicado');
})();
NODESCRIPT
EOF
```

⚠️ **AVISO:** Rollback completo NÃO é viável porque o código espera `who_type`

---

## 📊 CHECKLIST FINAL

Antes de considerar o bug resolvido:

- [ ] Hotfix aplicado no servidor (via script ou manual)
- [ ] Coluna `who_type` existe (VARCHAR 20 NOT NULL)
- [ ] Coluna `who_partner_id` existe (VARCHAR 36 NULL)
- [ ] Índices criados com sucesso
- [ ] Dashboard carrega sem erro 500
- [ ] API `/dashboard/data` retorna 200
- [ ] API `/action-plans/kanban` retorna 200
- [ ] API `/strategies` retorna 200
- [ ] API `/goals` retorna 200
- [ ] Console do navegador SEM erro `Invalid column name 'who_type'`
- [ ] Documentação atualizada (este arquivo)
- [ ] Memória salva no contexto
- [ ] Commit + push das correções

---

## 📚 PRÓXIMOS PASSOS (DIA SEGUINTE)

Após confirmar que o hotfix funcionou:

1. **Aplicar migrations pendentes (0043-0055)**
   - Ver `DIAGNOSTICO_PRODUCAO_BUG_FASE6_COMPLETO.md` seção 5

2. **Implementar CI/CD com migrations**
   - Automatizar aplicação de migrations no deploy
   - Validação pré/pós-deploy

3. **Smoke tests automatizados**
   - Validar endpoints críticos após cada deploy

---

**FIM DO PLANO DE CORREÇÃO**

*Execute o script `apply-hotfix-bug-022.sh` para aplicar a correção agora.*
