import sql from "mssql";
import type { MssqlPool } from "@/lib/audit/db";
import { getAuditFinPool, getAuditLegacyPool } from "@/lib/audit/db";
import { bulkInsert, toMssqlBigInt, type BulkRowValue } from "@/lib/audit/etl/bulk";

export type SnapshotRunInput = {
  periodStart: Date;
  periodEndInclusive: Date;
  axis: "VENCIMENTO" | "PAGAMENTO_REAL" | "DOCUMENTO";
  requestedBy: { userId: string; email: string };
  organizationId?: number | null;
  branchId?: number | null;
  legacyCompanyBranchCode?: number | null;
};

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

function addDaysUtc(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

async function ensureEtlSchema(audit: MssqlPool): Promise<void> {
  // Migrações idempotentes (schema evolution) para não depender de execução manual/SSH.
  // Executamos em etapas para evitar problemas de compile/metadata no mesmo batch do SQL Server.
  // Compat: ambientes antigos podem não ter colunas adicionadas após o init inicial.
  await audit.request().query(`
    IF OBJECT_ID('dbo.audit_raw_conta_bancaria','U') IS NOT NULL
      AND COL_LENGTH('dbo.audit_raw_conta_bancaria', 'numero_conta') IS NULL
    BEGIN
      ALTER TABLE dbo.audit_raw_conta_bancaria ADD numero_conta nvarchar(50) NULL;
    END
  `);

  // Multi-tenant no AuditFinDB: runs precisam ser segregadas por organização (AuraCore).
  // Isso permite listar/limpar runs com segurança por tenant.
  await audit.request().query(`
    IF OBJECT_ID('dbo.audit_snapshot_runs','U') IS NOT NULL
      AND COL_LENGTH('dbo.audit_snapshot_runs', 'organization_id') IS NULL
    BEGIN
      ALTER TABLE dbo.audit_snapshot_runs ADD organization_id int NULL;
    END
  `);

  await audit.request().query(`
    IF OBJECT_ID('dbo.audit_snapshot_runs','U') IS NOT NULL
      AND COL_LENGTH('dbo.audit_snapshot_runs', 'requested_by_user_id') IS NULL
    BEGIN
      ALTER TABLE dbo.audit_snapshot_runs ADD requested_by_user_id nvarchar(255) NULL;
    END
  `);

  await audit.request().query(`
    IF OBJECT_ID('dbo.audit_snapshot_runs','U') IS NOT NULL
      AND COL_LENGTH('dbo.audit_snapshot_runs', 'requested_by_email') IS NULL
    BEGIN
      ALTER TABLE dbo.audit_snapshot_runs ADD requested_by_email nvarchar(255) NULL;
    END
  `);

  await audit.request().query(`
    IF OBJECT_ID('dbo.audit_snapshot_runs','U') IS NOT NULL
      AND COL_LENGTH('dbo.audit_snapshot_runs', 'branch_id') IS NULL
    BEGIN
      ALTER TABLE dbo.audit_snapshot_runs ADD branch_id int NULL;
    END
  `);

  await audit.request().query(`
    IF OBJECT_ID('dbo.audit_snapshot_runs','U') IS NOT NULL
      AND COL_LENGTH('dbo.audit_snapshot_runs', 'legacy_company_branch_code') IS NULL
    BEGIN
      ALTER TABLE dbo.audit_snapshot_runs ADD legacy_company_branch_code int NULL;
    END
  `);

  await audit.request().query(`
    IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
      AND COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_inferida') IS NULL
    BEGIN
      ALTER TABLE dbo.audit_fact_parcelas ADD conta_bancaria_id_inferida bigint NULL;
    END
  `);

  await audit.request().query(`
    IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
      AND COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_inferida_regra') IS NULL
    BEGIN
      ALTER TABLE dbo.audit_fact_parcelas ADD conta_bancaria_inferida_regra nvarchar(50) NULL;
    END
  `);

  await audit.request().query(`
    IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
      AND COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_inferida_confidence') IS NULL
    BEGIN
      ALTER TABLE dbo.audit_fact_parcelas ADD conta_bancaria_inferida_confidence tinyint NULL;
    END
  `);

  await audit.request().query(`
    IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
      AND COL_LENGTH('dbo.audit_fact_parcelas', 'is_conta_bancaria_inferida') IS NULL
    BEGIN
      ALTER TABLE dbo.audit_fact_parcelas ADD is_conta_bancaria_inferida bit NULL;
    END
  `);

  await audit.request().query(`
    IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
      AND COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_efetiva') IS NULL
    BEGIN
      ALTER TABLE dbo.audit_fact_parcelas
        ADD conta_bancaria_id_efetiva AS (COALESCE(conta_bancaria_id, conta_bancaria_id_inferida)) PERSISTED;
    END
  `);

  await audit.request().query(`
    IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
      AND COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_inferida') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_audit_fact_parcelas_run_conta_inferida'
          AND object_id = OBJECT_ID('dbo.audit_fact_parcelas')
      )
    BEGIN
      CREATE INDEX IX_audit_fact_parcelas_run_conta_inferida
        ON dbo.audit_fact_parcelas (run_id, conta_bancaria_id_inferida);
    END
  `);

  await audit.request().query(`
    IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
      AND COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_efetiva') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_audit_fact_parcelas_run_conta_efetiva'
          AND object_id = OBJECT_ID('dbo.audit_fact_parcelas')
      )
    BEGIN
      CREATE INDEX IX_audit_fact_parcelas_run_conta_efetiva
        ON dbo.audit_fact_parcelas (run_id, conta_bancaria_id_efetiva);
    END
  `);

  const r = await audit.request().query(`
    SELECT
      OBJECT_ID('dbo.audit_snapshot_runs','U') as snapshot_runs,
      OBJECT_ID('dbo.audit_raw_movimentos','U') as raw_movimentos,
      OBJECT_ID('dbo.audit_raw_movimentos_detalhe','U') as raw_movimentos_detalhe,
      OBJECT_ID('dbo.audit_raw_compras','U') as raw_compras,
      OBJECT_ID('dbo.audit_raw_pagamentos','U') as raw_pagamentos,
      OBJECT_ID('dbo.audit_raw_pagamentos_detalhe','U') as raw_pagamentos_detalhe,
      OBJECT_ID('dbo.audit_raw_movimento_bancario','U') as raw_movimento_bancario,
      OBJECT_ID('dbo.audit_raw_conta_bancaria','U') as raw_conta_bancaria,
      OBJECT_ID('dbo.audit_dim_tipo_movimento_bancario','U') as dim_tipo_mov_bancario,
      OBJECT_ID('dbo.audit_fact_caixa_fechamento','U') as fact_caixa_fechamento,
      OBJECT_ID('dbo.audit_fact_cashflow_daily','U') as fact_cashflow_daily,
      OBJECT_ID('dbo.audit_fact_parcelas','U') as fact_parcelas,
      OBJECT_ID('dbo.audit_findings','U') as findings,
      COL_LENGTH('dbo.audit_raw_movimentos', 'plano_contas_contabil_codigo_tipo_operacao') as col_tipo_operacao,
      COL_LENGTH('dbo.audit_raw_movimentos', 'codigo_empresa_filial') as col_mov_filial,
      COL_LENGTH('dbo.audit_raw_movimentos', 'centro_custo_id') as col_mov_cc,
      COL_LENGTH('dbo.audit_raw_movimento_bancario', 'tipo_movimento_bancario') as col_mb_tipo,
      COL_LENGTH('dbo.audit_raw_conta_bancaria', 'numero_conta') as col_cb_numero_conta,
      -- Projeção por conta: rastreia inferência (não sobrescreve o dado real)
      COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_inferida') as col_fact_conta_inferida_id,
      COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_inferida_regra') as col_fact_conta_inferida_regra,
      COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_inferida_confidence') as col_fact_conta_inferida_confidence,
      COL_LENGTH('dbo.audit_fact_parcelas', 'is_conta_bancaria_inferida') as col_fact_is_conta_inferida,
      COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_efetiva') as col_fact_conta_efetiva
  `);

  const row = (r.recordset?.[0] ?? {}) as Record<string, unknown>;
  const missing = Object.entries(row)
    .filter(([k, v]) => (k.startsWith("col_") ? v === null : !v))
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(
      `Schema ETL não inicializado (faltando: ${missing.join(
        ", "
      )}). Rode sql/auditdb_init.sql e sql/auditdb_etl_init.sql (e, se aplicável, o patch de inferência de conta bancária) no AuditFinDB.`
    );
  }
}

type SnapshotRunStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

async function insertRun(
  audit: MssqlPool,
  runId: string,
  input: SnapshotRunInput,
  status: SnapshotRunStatus
) {
  await audit
    .request()
    // NOTE: evitamos passar `type` explicitamente para reduzir risco de incompatibilidades do driver.
    .input("run_id", runId)
    .input("status", status)
    .input("period_start", input.periodStart)
    .input("period_end", input.periodEndInclusive)
    .input("organization_id", (input.organizationId ?? null) as any)
    .input("branch_id", (input.branchId ?? null) as any)
    .input("legacy_company_branch_code", (input.legacyCompanyBranchCode ?? null) as any)
    .input("requested_by_user_id", input.requestedBy.userId)
    .input("requested_by_email", input.requestedBy.email)
    .query(
      `INSERT INTO dbo.audit_snapshot_runs (
         run_id, status, period_start, period_end,
         organization_id, branch_id, legacy_company_branch_code,
         requested_by_user_id, requested_by_email
       )
       VALUES (
         @run_id, @status, @period_start, @period_end,
         @organization_id, @branch_id, @legacy_company_branch_code,
         @requested_by_user_id, @requested_by_email
       )`
    );
}

async function markRunRunning(audit: MssqlPool, runId: string) {
  // Garante que uma execução "queued" não fique pendurada como RUNNING se o processo morrer antes de começar.
  // No início da execução real, promovemos para RUNNING e "resetamos" finished/error.
  await audit
    .request()
    .input("run_id", runId)
    .query(
      `UPDATE dbo.audit_snapshot_runs
       SET status = 'RUNNING',
           started_at = COALESCE(started_at, SYSUTCDATETIME()),
           finished_at = NULL,
           error_message = NULL
       WHERE run_id = @run_id`
    );
}

async function finishRunSuccess(audit: MssqlPool, runId: string) {
  await audit
    .request()
    .input("run_id", runId)
    .query(
      `UPDATE dbo.audit_snapshot_runs
       SET status = 'SUCCEEDED', finished_at = SYSUTCDATETIME(), error_message = NULL
       WHERE run_id = @run_id`
    );
}

async function finishRunFailed(audit: MssqlPool, runId: string, message: string) {
  await audit
    .request()
    .input("run_id", runId)
    .input("msg", message.slice(0, 2000))
    .query(
      `UPDATE dbo.audit_snapshot_runs
       SET status = 'FAILED', finished_at = SYSUTCDATETIME(), error_message = @msg
       WHERE run_id = @run_id`
    );
}

// Para VENCIMENTO: recorte por movimentos_detalhe.data_vencimento (e para NULL, usamos fallback em m.data_movimento no mesmo período)
const VENCIMENTO_WHERE = `
  (
    (md.data_vencimento IS NOT NULL AND md.data_vencimento >= @start AND md.data_vencimento < @end)
    OR
    (md.data_vencimento IS NULL AND m.data_movimento >= @start AND m.data_movimento < @end)
  )
`;

async function extractRawMovimentosVencimento(
  legacy: MssqlPool,
  start: Date,
  endExclusive: Date,
  legacyCompanyBranchCode?: number | null
) {
  const r = await legacy
    .request()
    .input("start", start)
    .input("end", endExclusive)
    .input("filial", (legacyCompanyBranchCode ?? null) as any)
    .query(`
      SELECT DISTINCT
        CAST(m.codigo_movimento as bigint) as movimento_id,
        CAST(m.codigo_pessoa as bigint) as pessoa_id,
        CAST(m.CodigoEmpresaFilial as smallint) as codigo_empresa_filial,
        CAST(m.IDCentroCusto as int) as centro_custo_id,
        CAST(m.IDPlanoContasContabil as bigint) as plano_contas_contabil_id,
        CAST(pcc.codigo_tipo_operacao as smallint) as plano_contas_contabil_codigo_tipo_operacao,
        CAST(m.codigo_conta as bigint) as codigo_conta,
        CAST(m.numero_documento as int) as numero_documento,
        CAST(m.valor_total as decimal(19,4)) as valor_total,
        CONVERT(datetime2(0), m.data_movimento) as data_movimento,
        CONVERT(datetime2(0), m.dataEmissao) as data_emissao,
        CAST(m.type_operation as smallint) as type_operation,
        CAST(m.IDMovimentoPai as bigint) as movimento_pai_id
      FROM dbo.movimentos m
      INNER JOIN dbo.movimentos_detalhe md
        ON md.codigo_movimento = m.codigo_movimento
      LEFT JOIN dbo.PlanoContasContabil pcc
        ON pcc.ID = m.IDPlanoContasContabil
      WHERE ${VENCIMENTO_WHERE}
        AND (@filial IS NULL OR m.CodigoEmpresaFilial = @filial)
    `);

  return r.recordset as Array<Record<string, unknown>>;
}

async function extractRawMovimentosDetalheVencimento(
  legacy: MssqlPool,
  start: Date,
  endExclusive: Date,
  legacyCompanyBranchCode?: number | null
) {
  const r = await legacy
    .request()
    .input("start", start)
    .input("end", endExclusive)
    .input("filial", (legacyCompanyBranchCode ?? null) as any)
    .query(`
      SELECT
        CAST(md.codigo_movimento_detalhe as bigint) as parcela_id,
        CAST(md.codigo_movimento as bigint) as movimento_id,
        CAST(md.numero_parcela as smallint) as numero_parcela,
        CAST(md.valor_parcela as decimal(19,4)) as valor_parcela,
        CONVERT(datetime2(0), md.data_vencimento) as data_vencimento,
        CAST(md.codigo_pagamento as bigint) as codigo_pagamento
      FROM dbo.movimentos_detalhe md
      INNER JOIN dbo.movimentos m
        ON m.codigo_movimento = md.codigo_movimento
      WHERE ${VENCIMENTO_WHERE}
        AND (@filial IS NULL OR m.CodigoEmpresaFilial = @filial)
    `);
  return r.recordset as Array<Record<string, unknown>>;
}

async function extractRawComprasVencimento(
  legacy: MssqlPool,
  start: Date,
  endExclusive: Date,
  legacyCompanyBranchCode?: number | null
) {
  const r = await legacy
    .request()
    .input("start", start)
    .input("end", endExclusive)
    .input("filial", (legacyCompanyBranchCode ?? null) as any)
    .query(`
      SELECT DISTINCT
        CAST(c.ID as bigint) as compra_id,
        CAST(c.IDMovimento as bigint) as movimento_id,
        CAST(c.IDFornecedor as bigint) as fornecedor_id,
        CONVERT(datetime2(0), c.DataNF) as data_nf,
        CAST(c.valorNF as decimal(19,4)) as valor_nf,
        CAST(c.idPlanoConta as bigint) as plano_conta_id,
        CAST(c.IDPlanoContabil as bigint) as plano_contabil_id
      FROM dbo.Compras c
      INNER JOIN dbo.movimentos m
        ON m.codigo_movimento = c.IDMovimento
      INNER JOIN dbo.movimentos_detalhe md
        ON md.codigo_movimento = m.codigo_movimento
      WHERE ${VENCIMENTO_WHERE}
        AND (@filial IS NULL OR m.CodigoEmpresaFilial = @filial)
    `);
  return r.recordset as Array<Record<string, unknown>>;
}

async function extractRawPagamentosVencimento(
  legacy: MssqlPool,
  start: Date,
  endExclusive: Date,
  legacyCompanyBranchCode?: number | null
) {
  const r = await legacy
    .request()
    .input("start", start)
    .input("end", endExclusive)
    .input("filial", (legacyCompanyBranchCode ?? null) as any)
    .query(`
      SELECT DISTINCT
        CAST(p.codigo_pagamento as bigint) as pagamento_id,
        CONVERT(datetime2(0), p.data_pagamento) as data_pagamento,
        CAST(p.valor_total as decimal(19,4)) as valor_total
      FROM dbo.pagamentos p
      INNER JOIN dbo.movimentos_detalhe md
        ON md.codigo_pagamento = p.codigo_pagamento
      INNER JOIN dbo.movimentos m
        ON m.codigo_movimento = md.codigo_movimento
      WHERE ${VENCIMENTO_WHERE}
        AND (@filial IS NULL OR m.CodigoEmpresaFilial = @filial)
    `);
  return r.recordset as Array<Record<string, unknown>>;
}

async function extractRawPagamentosDetalheVencimento(
  legacy: MssqlPool,
  start: Date,
  endExclusive: Date,
  legacyCompanyBranchCode?: number | null
) {
  const r = await legacy
    .request()
    .input("start", start)
    .input("end", endExclusive)
    .input("filial", (legacyCompanyBranchCode ?? null) as any)
    .query(`
      SELECT DISTINCT
        CAST(pd.codigo_pagamento_detalhe as bigint) as pagamento_detalhe_id,
        CAST(pd.codigo_pagamento as bigint) as pagamento_id,
        CAST(pd.codigo_tipo_pagamento as bigint) as tipo_pagamento_id,
        CAST(pd.valor as decimal(19,4)) as valor
      FROM dbo.pagamentos_detalhe pd
      INNER JOIN dbo.pagamentos p
        ON p.codigo_pagamento = pd.codigo_pagamento
      INNER JOIN dbo.movimentos_detalhe md
        ON md.codigo_pagamento = p.codigo_pagamento
      INNER JOIN dbo.movimentos m
        ON m.codigo_movimento = md.codigo_movimento
      WHERE ${VENCIMENTO_WHERE}
        AND (@filial IS NULL OR m.CodigoEmpresaFilial = @filial)
    `);
  return r.recordset as Array<Record<string, unknown>>;
}

async function extractRawMovimentoBancarioVencimento(
  legacy: MssqlPool,
  start: Date,
  endExclusive: Date,
  legacyCompanyBranchCode?: number | null
) {
  const r = await legacy
    .request()
    .input("start", start)
    .input("end", endExclusive)
    .input("filial", (legacyCompanyBranchCode ?? null) as any)
    .query(`
      SELECT DISTINCT
        CAST(mb.codigo_movimento_bancario as bigint) as movimento_bancario_id,
        CAST(mb.IDPagamentoDetalhe as bigint) as pagamento_detalhe_id,
        CAST(mb.codigo_conta_bancaria as bigint) as conta_bancaria_id,
        CAST(mb.tipo_movimento_bancario as smallint) as tipo_movimento_bancario,
        CONVERT(datetime2(0), mb.data_lancamento) as data_lancamento,
        CONVERT(datetime2(0), mb.data_real) as data_real,
        CAST(mb.valor as decimal(19,4)) as valor,
        CAST(mb.boolConciliado as bit) as bool_conciliado
      FROM dbo.movimento_bancario mb
      INNER JOIN dbo.pagamentos_detalhe pd
        ON pd.codigo_pagamento_detalhe = mb.IDPagamentoDetalhe
      INNER JOIN dbo.pagamentos p
        ON p.codigo_pagamento = pd.codigo_pagamento
      INNER JOIN dbo.movimentos_detalhe md
        ON md.codigo_pagamento = p.codigo_pagamento
      INNER JOIN dbo.movimentos m
        ON m.codigo_movimento = md.codigo_movimento
      WHERE ${VENCIMENTO_WHERE}
        AND (@filial IS NULL OR m.CodigoEmpresaFilial = @filial)
    `);
  return r.recordset as Array<Record<string, unknown>>;
}

async function extractRawContaBancaria(legacy: MssqlPool, legacyCompanyBranchCode?: number | null) {
  const r = await legacy
    .request()
    .input("filial", (legacyCompanyBranchCode ?? null) as any)
    .query(`
    SELECT
      CAST(cb.codigo_conta_bancaria as bigint) as conta_bancaria_id,
      CAST(cb.CodigoEmpresaFilial as smallint) as codigo_empresa_filial,
      CAST(cb.saldo_inicial as decimal(19,4)) as saldo_inicial,
      CAST(cb.descricao as nvarchar(255)) as descricao,
      CAST(cb.nome_banco as nvarchar(255)) as nome_banco,
      CAST(cb.agencia as nvarchar(50)) as agencia,
      -- No GlobalTCL (legado) a coluna é numero_conta_bancaria
      CAST(cb.numero_conta_bancaria as nvarchar(50)) as numero_conta,
      CAST(cb.nome_titular as nvarchar(255)) as nome_titular,
      CAST(cb.IsAtivo as bit) as is_ativo
    FROM dbo.conta_bancaria cb
    WHERE (@filial IS NULL OR cb.CodigoEmpresaFilial = @filial)
  `);
  return r.recordset as Array<Record<string, unknown>>;
}

async function extractDimTipoMovimentoBancario(legacy: MssqlPool) {
  const r = await legacy.request().query(`
    SELECT
      CAST(t.codigo_tipo_movimento_bancario as smallint) as codigo_tipo_movimento_bancario,
      CAST(t.descricao as nvarchar(255)) as descricao,
      CAST(t.codigo_tipo_operacao as smallint) as codigo_tipo_operacao
    FROM dbo.tipo_movimento_bancario t
  `);
  return r.recordset as Array<Record<string, unknown>>;
}

async function extractFactCaixaFechamento(
  legacy: MssqlPool,
  start: Date,
  endExclusive: Date,
  legacyCompanyBranchCode?: number | null
) {
  const r = await legacy
    .request()
    .input("start", start)
    .input("end", endExclusive)
    .input("filial", (legacyCompanyBranchCode ?? null) as any)
    .query(`
      SELECT
        CAST(CONVERT(date, cf.Data) as date) as data,
        CAST(cf.IdContaBancaria as bigint) as conta_bancaria_id,
        CAST(cb.CodigoEmpresaFilial as smallint) as codigo_empresa_filial,
        CAST(cf.IdStatus as int) as status_id,
        CAST(cfs.Descricao as nvarchar(255)) as status_descricao,
        CAST(MAX(cfh.Descricao) as nvarchar(1000)) as historico,
        CAST(MAX(u.UserName) as nvarchar(255)) as usuario,
        CAST(MAX(e.descricao) as nvarchar(255)) as empresa
      FROM dbo.CaixaFechamento cf
      LEFT JOIN dbo.conta_bancaria cb ON cb.codigo_conta_bancaria = cf.IdContaBancaria
      LEFT JOIN dbo.CaixaFechamentoStatus cfs ON cfs.Id = cf.IdStatus
      LEFT JOIN dbo.CaixaFechamentoHistorico cfh ON cfh.IdCaixaFechamento = cf.Id
      LEFT JOIN dbo.aspnet_Users u ON u.UserId = cfh.UserId
      LEFT JOIN dbo.empresa_filial ef ON ef.codigo_empresa_filial = cb.CodigoEmpresaFilial
      LEFT JOIN dbo.empresa e ON e.codigo_empresa = ef.codigo_empresa
      WHERE cf.Data >= @start AND cf.Data < @end
        AND cb.IsAtivo = 1
        AND (cf.IdStatus = 1 OR cfh.Descricao IS NOT NULL)
        AND (@filial IS NULL OR cb.CodigoEmpresaFilial = @filial)
      GROUP BY
        CONVERT(date, cf.Data),
        cf.IdContaBancaria,
        cb.CodigoEmpresaFilial,
        cf.IdStatus,
        cfs.Descricao
    `);
  return r.recordset as Array<Record<string, unknown>>;
}

async function syncDimTipoMovimentoBancario(audit: MssqlPool, legacy: MssqlPool) {
  const rows = await extractDimTipoMovimentoBancario(legacy);
  await audit.request().query(`
    BEGIN TRY
      BEGIN TRAN;
      DELETE FROM dbo.audit_dim_tipo_movimento_bancario;
      COMMIT;
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT > 0 ROLLBACK;
      THROW;
    END CATCH
  `);

  await bulkInsert(
    audit,
    "dbo.audit_dim_tipo_movimento_bancario",
    [
      { name: "codigo_tipo_movimento_bancario", type: sql.SmallInt, nullable: false },
      { name: "descricao", type: sql.NVarChar(255), nullable: true },
      { name: "codigo_tipo_operacao", type: sql.SmallInt, nullable: true },
    ],
    rows as Array<Record<string, BulkRowValue>>
  );
}

async function loadRawsToAudit(
  audit: MssqlPool,
  runId: string,
  raws: {
    movimentos: Array<Record<string, unknown>>;
    movimentos_detalhe: Array<Record<string, unknown>>;
    compras: Array<Record<string, unknown>>;
    pagamentos: Array<Record<string, unknown>>;
    pagamentos_detalhe: Array<Record<string, unknown>>;
    movimento_bancario: Array<Record<string, unknown>>;
    conta_bancaria: Array<Record<string, unknown>>;
    caixa_fechamento: Array<Record<string, unknown>>;
  }
) {
  const withRun = <T extends Record<string, unknown>>(rows: T[]): T[] =>
    rows.map((r) => ({ ...r, run_id: runId }));

  const normalize = (
    rows: Array<Record<string, unknown>>,
    bigintCols: string[]
  ): Array<Record<string, BulkRowValue>> =>
    rows.map((r) => {
      const x: Record<string, BulkRowValue> = { ...r } as Record<string, BulkRowValue>;
      for (const c of bigintCols) x[c] = toMssqlBigInt(r[c]);
      return x;
    });

  const movimentos = normalize(withRun(raws.movimentos), [
    "movimento_id",
    "pessoa_id",
    "plano_contas_contabil_id",
    "codigo_conta",
    "movimento_pai_id",
  ]);
  const movimentosDetalhe = normalize(withRun(raws.movimentos_detalhe), [
    "parcela_id",
    "movimento_id",
    "codigo_pagamento",
  ]);
  const compras = normalize(withRun(raws.compras), [
    "compra_id",
    "movimento_id",
    "fornecedor_id",
    "plano_conta_id",
    "plano_contabil_id",
  ]);
  const pagamentos = normalize(withRun(raws.pagamentos), ["pagamento_id"]);
  const pagamentosDetalhe = normalize(withRun(raws.pagamentos_detalhe), [
    "pagamento_detalhe_id",
    "pagamento_id",
    "tipo_pagamento_id",
  ]);
  const movimentoBancario = normalize(withRun(raws.movimento_bancario), [
    "movimento_bancario_id",
    "pagamento_detalhe_id",
    "conta_bancaria_id",
  ]);
  const contaBancaria = normalize(withRun(raws.conta_bancaria), ["conta_bancaria_id"]);

  await bulkInsert(
    audit,
    "dbo.audit_raw_movimentos",
    [
      { name: "run_id", type: sql.UniqueIdentifier, nullable: false },
      { name: "movimento_id", type: sql.BigInt, nullable: false },
      { name: "pessoa_id", type: sql.BigInt, nullable: true },
      { name: "codigo_empresa_filial", type: sql.SmallInt, nullable: true },
      { name: "centro_custo_id", type: sql.Int, nullable: true },
      { name: "plano_contas_contabil_id", type: sql.BigInt, nullable: true },
      { name: "plano_contas_contabil_codigo_tipo_operacao", type: sql.SmallInt, nullable: true },
      { name: "codigo_conta", type: sql.BigInt, nullable: true },
      { name: "numero_documento", type: sql.Int, nullable: true },
      { name: "valor_total", type: sql.Decimal(19, 4), nullable: true },
      { name: "data_movimento", type: sql.DateTime2(0), nullable: true },
      { name: "data_emissao", type: sql.DateTime2(0), nullable: true },
      { name: "type_operation", type: sql.SmallInt, nullable: true },
      { name: "movimento_pai_id", type: sql.BigInt, nullable: true },
    ],
    movimentos
  );

  await bulkInsert(
    audit,
    "dbo.audit_raw_movimentos_detalhe",
    [
      { name: "run_id", type: sql.UniqueIdentifier, nullable: false },
      { name: "parcela_id", type: sql.BigInt, nullable: false },
      { name: "movimento_id", type: sql.BigInt, nullable: false },
      { name: "numero_parcela", type: sql.SmallInt, nullable: true },
      { name: "valor_parcela", type: sql.Decimal(19, 4), nullable: true },
      { name: "data_vencimento", type: sql.DateTime2(0), nullable: true },
      { name: "codigo_pagamento", type: sql.BigInt, nullable: true },
    ],
    movimentosDetalhe
  );

  await bulkInsert(
    audit,
    "dbo.audit_raw_compras",
    [
      { name: "run_id", type: sql.UniqueIdentifier, nullable: false },
      { name: "compra_id", type: sql.BigInt, nullable: false },
      { name: "movimento_id", type: sql.BigInt, nullable: false },
      { name: "fornecedor_id", type: sql.BigInt, nullable: true },
      { name: "data_nf", type: sql.DateTime2(0), nullable: true },
      { name: "valor_nf", type: sql.Decimal(19, 4), nullable: true },
      { name: "plano_conta_id", type: sql.BigInt, nullable: true },
      { name: "plano_contabil_id", type: sql.BigInt, nullable: true },
    ],
    compras
  );

  await bulkInsert(
    audit,
    "dbo.audit_raw_pagamentos",
    [
      { name: "run_id", type: sql.UniqueIdentifier, nullable: false },
      { name: "pagamento_id", type: sql.BigInt, nullable: false },
      { name: "data_pagamento", type: sql.DateTime2(0), nullable: true },
      { name: "valor_total", type: sql.Decimal(19, 4), nullable: true },
    ],
    pagamentos
  );

  await bulkInsert(
    audit,
    "dbo.audit_raw_pagamentos_detalhe",
    [
      { name: "run_id", type: sql.UniqueIdentifier, nullable: false },
      { name: "pagamento_detalhe_id", type: sql.BigInt, nullable: false },
      { name: "pagamento_id", type: sql.BigInt, nullable: false },
      { name: "tipo_pagamento_id", type: sql.BigInt, nullable: true },
      { name: "valor", type: sql.Decimal(19, 4), nullable: true },
    ],
    pagamentosDetalhe
  );

  await bulkInsert(
    audit,
    "dbo.audit_raw_movimento_bancario",
    [
      { name: "run_id", type: sql.UniqueIdentifier, nullable: false },
      { name: "movimento_bancario_id", type: sql.BigInt, nullable: false },
      { name: "pagamento_detalhe_id", type: sql.BigInt, nullable: true },
      { name: "conta_bancaria_id", type: sql.BigInt, nullable: true },
      { name: "tipo_movimento_bancario", type: sql.SmallInt, nullable: true },
      { name: "data_lancamento", type: sql.DateTime2(0), nullable: true },
      { name: "data_real", type: sql.DateTime2(0), nullable: true },
      { name: "valor", type: sql.Decimal(19, 4), nullable: true },
      { name: "bool_conciliado", type: sql.Bit, nullable: true },
    ],
    movimentoBancario
  );

  await bulkInsert(
    audit,
    "dbo.audit_raw_conta_bancaria",
    [
      { name: "run_id", type: sql.UniqueIdentifier, nullable: false },
      { name: "conta_bancaria_id", type: sql.BigInt, nullable: false },
      { name: "codigo_empresa_filial", type: sql.SmallInt, nullable: true },
      { name: "saldo_inicial", type: sql.Decimal(19, 4), nullable: true },
      { name: "descricao", type: sql.NVarChar(255), nullable: true },
      { name: "nome_banco", type: sql.NVarChar(255), nullable: true },
      { name: "agencia", type: sql.NVarChar(50), nullable: true },
      { name: "numero_conta", type: sql.NVarChar(50), nullable: true },
      { name: "nome_titular", type: sql.NVarChar(255), nullable: true },
      { name: "is_ativo", type: sql.Bit, nullable: true },
    ],
    contaBancaria
  );

  await audit.request().input("run_id", runId).query(`
    DELETE FROM dbo.audit_fact_caixa_fechamento WHERE run_id = @run_id;
  `);

  await bulkInsert(
    audit,
    "dbo.audit_fact_caixa_fechamento",
    [
      { name: "run_id", type: sql.UniqueIdentifier, nullable: false },
      { name: "data", type: sql.Date, nullable: false },
      { name: "conta_bancaria_id", type: sql.BigInt, nullable: false },
      { name: "codigo_empresa_filial", type: sql.SmallInt, nullable: true },
      { name: "status_id", type: sql.Int, nullable: true },
      { name: "status_descricao", type: sql.NVarChar(255), nullable: true },
      { name: "historico", type: sql.NVarChar(1000), nullable: true },
      { name: "usuario", type: sql.NVarChar(255), nullable: true },
      { name: "empresa", type: sql.NVarChar(255), nullable: true },
    ],
    (withRun(raws.caixa_fechamento) as unknown) as Array<Record<string, BulkRowValue>>
  );
}

async function transformFact(audit: MssqlPool, runId: string) {
  await audit
    .request()
    .input("run_id", runId)
    .query(`
      BEGIN TRY
        BEGIN TRAN;

        DELETE FROM dbo.audit_findings WHERE run_id = @run_id;
        DELETE FROM dbo.audit_fact_parcelas WHERE run_id = @run_id;

        ;WITH md_ranked AS (
          SELECT
            md.*,
            ROW_NUMBER() OVER (
              PARTITION BY md.run_id, md.parcela_id
              ORDER BY md.movimento_id, md.codigo_pagamento
            ) as rn
          FROM dbo.audit_raw_movimentos_detalhe md
          WHERE md.run_id = @run_id
        ),
        md_dedup AS (
          SELECT
            run_id,
            parcela_id,
            movimento_id,
            numero_parcela,
            valor_parcela,
            data_vencimento,
            codigo_pagamento
          FROM md_ranked
          WHERE rn = 1
        ),
        compras_agg AS (
          SELECT
            run_id,
            movimento_id,
            MIN(compra_id) as compra_id,
            MIN(data_nf) as data_nf
          FROM dbo.audit_raw_compras
          WHERE run_id = @run_id
          GROUP BY run_id, movimento_id
        ),
        banco_por_pagamento AS (
          SELECT
            pd.run_id,
            pd.pagamento_id,
            MAX(mb.data_real) as data_real,
            MAX(mb.data_lancamento) as data_lancamento,
            SUM(COALESCE(mb.valor, 0)) as valor_pago,
            MAX(mb.conta_bancaria_id) as conta_bancaria_id,
            CAST(MAX(COALESCE(CAST(mb.bool_conciliado as int), 0)) as bit) as bool_conciliado,
            COUNT(mb.movimento_bancario_id) as qtd_mov_banc
          FROM dbo.audit_raw_pagamentos_detalhe pd
          LEFT JOIN dbo.audit_raw_movimento_bancario mb
            ON mb.run_id = pd.run_id AND mb.pagamento_detalhe_id = pd.pagamento_detalhe_id
          WHERE pd.run_id = @run_id
          GROUP BY pd.run_id, pd.pagamento_id
        )
        INSERT INTO dbo.audit_fact_parcelas (
          run_id, parcela_id, movimento_id, compra_id, pessoa_id,
          codigo_empresa_filial, centro_custo_id, plano_contas_contabil_id, numero_documento, operacao,
          data_documento, data_vencimento, data_pagamento_real, data_lancamento_banco,
          valor_parcela, valor_pago, codigo_pagamento, conta_bancaria_id, qtd_mov_banco,
          has_vinculo_bancario, bool_conciliado, status
        )
        SELECT
          md.run_id,
          md.parcela_id,
          md.movimento_id,
          ca.compra_id,
          m.pessoa_id,
          m.codigo_empresa_filial,
          m.centro_custo_id,
          m.plano_contas_contabil_id,
          m.numero_documento,
          CASE WHEN m.plano_contas_contabil_codigo_tipo_operacao = 1 THEN 'RECEBIMENTO' ELSE 'PAGAMENTO' END as operacao,
          COALESCE(ca.data_nf, m.data_emissao) as data_documento,
          md.data_vencimento,
          bp.data_real as data_pagamento_real,
          bp.data_lancamento as data_lancamento_banco,
          md.valor_parcela,
          CASE WHEN bp.qtd_mov_banc > 0 THEN bp.valor_pago ELSE NULL END as valor_pago,
          md.codigo_pagamento,
          bp.conta_bancaria_id,
          bp.qtd_mov_banc as qtd_mov_banco,
          CASE WHEN bp.qtd_mov_banc > 0 THEN 1 ELSE 0 END as has_vinculo_bancario,
          bp.bool_conciliado,
          CASE
            WHEN bp.data_real IS NOT NULL THEN
              CASE
                WHEN bp.bool_conciliado = 1 THEN 'CONCILIADA'
                ELSE 'PENDENTE_CONCILIACAO'
              END
            WHEN bp.qtd_mov_banc > 0 THEN 'PAGA_SEM_DATA_REAL'
            WHEN md.codigo_pagamento IS NOT NULL THEN 'SEM_VINCULO_BANCARIO'
            WHEN md.data_vencimento IS NOT NULL AND md.data_vencimento < SYSUTCDATETIME() THEN 'VENCIDA'
            ELSE 'ABERTA'
          END as status
        FROM md_dedup md
        INNER JOIN dbo.audit_raw_movimentos m
          ON m.run_id = md.run_id AND m.movimento_id = md.movimento_id
        LEFT JOIN compras_agg ca
          ON ca.run_id = md.run_id AND ca.movimento_id = md.movimento_id
        LEFT JOIN banco_por_pagamento bp
          ON bp.run_id = md.run_id AND bp.pagamento_id = md.codigo_pagamento
        WHERE md.run_id = @run_id;

        -- 🔮 Projeção por conta bancária (DEFAULT BTG por filial/matriz)
        --
        -- Benchmark (prática comum em cash forecasting): usar "house bank" como default e tratar exceções via regras.
        -- Aqui NÃO sobrescrevemos conta_bancaria_id real (vínculo bancário). Gravamos inferência em colunas próprias.
        --
        -- Regra:
        -- - Se a parcela não tem conta_bancaria_id (ainda não paga/vinculada), inferimos:
        --   1) conta BTG da filial (descricao LIKE 'BTG%') quando existir
        --   2) senão, BTG Matriz (descricao = 'BTG Matriz' ou LIKE '%BTG%Matriz%')
        UPDATE f
        SET
          conta_bancaria_id_inferida = COALESCE(btg_filial.conta_bancaria_id, btg_matriz.conta_bancaria_id),
          conta_bancaria_inferida_regra = CASE
            WHEN btg_filial.conta_bancaria_id IS NOT NULL THEN 'DEFAULT_BTG_FILIAL'
            WHEN btg_matriz.conta_bancaria_id IS NOT NULL THEN 'DEFAULT_BTG_MATRIZ'
            ELSE NULL
          END,
          conta_bancaria_inferida_confidence = CASE
            WHEN btg_filial.conta_bancaria_id IS NOT NULL THEN 3 -- alta
            WHEN btg_matriz.conta_bancaria_id IS NOT NULL THEN 2 -- média
            ELSE NULL
          END,
          is_conta_bancaria_inferida = CASE
            WHEN COALESCE(btg_filial.conta_bancaria_id, btg_matriz.conta_bancaria_id) IS NOT NULL THEN 1
            ELSE 0
          END
        FROM dbo.audit_fact_parcelas f
        OUTER APPLY (
          SELECT TOP 1 cb.conta_bancaria_id
          FROM dbo.audit_raw_conta_bancaria cb
          WHERE cb.run_id = f.run_id
            AND cb.codigo_empresa_filial = f.codigo_empresa_filial
            AND cb.descricao LIKE 'BTG%'
          ORDER BY cb.conta_bancaria_id DESC
        ) btg_filial
        OUTER APPLY (
          SELECT TOP 1 cb.conta_bancaria_id
          FROM dbo.audit_raw_conta_bancaria cb
          WHERE cb.run_id = f.run_id
            AND (cb.descricao = 'BTG Matriz' OR cb.descricao LIKE '%BTG%Matriz%')
          ORDER BY cb.conta_bancaria_id DESC
        ) btg_matriz
        WHERE f.run_id = @run_id
          AND f.conta_bancaria_id IS NULL
          AND f.data_vencimento IS NOT NULL
          AND (f.conta_bancaria_id_inferida IS NULL OR f.is_conta_bancaria_inferida = 0);

        COMMIT;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
      END CATCH
    `);
}

async function transformCashflowDaily(audit: MssqlPool, runId: string) {
  await audit.request().input("run_id", runId).query(`
    BEGIN TRY
      BEGIN TRAN;

      DELETE FROM dbo.audit_fact_cashflow_daily WHERE run_id = @run_id;

      ;WITH mb_base AS (
        SELECT
          mb.run_id,
          mb.conta_bancaria_id,
          CAST(COALESCE(mb.data_real, mb.data_lancamento) as date) as data,
          mb.valor,
          mb.tipo_movimento_bancario
        FROM dbo.audit_raw_movimento_bancario mb
        WHERE mb.run_id = @run_id
          AND mb.conta_bancaria_id IS NOT NULL
          AND COALESCE(mb.data_real, mb.data_lancamento) IS NOT NULL
      ),
      daily AS (
        SELECT
          b.run_id,
          b.conta_bancaria_id,
          b.data,
          SUM(CASE WHEN t.codigo_tipo_operacao = 1 THEN COALESCE(b.valor,0) ELSE 0 END) as entradas,
          SUM(CASE WHEN t.codigo_tipo_operacao = 2 THEN COALESCE(b.valor,0) ELSE 0 END) as saidas,
          SUM(CASE WHEN t.codigo_tipo_operacao = 1 THEN COALESCE(b.valor,0)
                   WHEN t.codigo_tipo_operacao = 2 THEN -COALESCE(b.valor,0)
                   ELSE 0 END) as liquido
        FROM mb_base b
        LEFT JOIN dbo.audit_dim_tipo_movimento_bancario t
          ON t.codigo_tipo_movimento_bancario = b.tipo_movimento_bancario
        GROUP BY b.run_id, b.conta_bancaria_id, b.data
      ),
      with_open AS (
        SELECT
          d.run_id,
          d.data,
          d.conta_bancaria_id,
          cb.codigo_empresa_filial,
          d.entradas,
          d.saidas,
          d.liquido,
          cb.saldo_inicial
        FROM daily d
        LEFT JOIN dbo.audit_raw_conta_bancaria cb
          ON cb.run_id = d.run_id AND cb.conta_bancaria_id = d.conta_bancaria_id
      ),
      with_status AS (
        SELECT
          x.*,
          cf.status_descricao as status_caixa
        FROM with_open x
        LEFT JOIN dbo.audit_fact_caixa_fechamento cf
          ON cf.run_id = x.run_id AND cf.conta_bancaria_id = x.conta_bancaria_id AND cf.data = x.data
      )
      INSERT INTO dbo.audit_fact_cashflow_daily (
        run_id, data, conta_bancaria_id, codigo_empresa_filial,
        entradas, saidas, liquido,
        saldo_inicial, saldo_final, status_caixa
      )
      SELECT
        run_id,
        data,
        conta_bancaria_id,
        codigo_empresa_filial,
        entradas,
        saidas,
        liquido,
        saldo_inicial,
        COALESCE(saldo_inicial, 0) + SUM(liquido) OVER (
          PARTITION BY run_id, conta_bancaria_id
          ORDER BY data
          ROWS UNBOUNDED PRECEDING
        ) as saldo_final,
        status_caixa
      FROM with_status;

      COMMIT;
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT > 0 ROLLBACK;
      THROW;
    END CATCH
  `);
}

async function generateFindingsP0(audit: MssqlPool, runId: string) {
  const tolerance = 0.01;

  await audit
    .request()
    .input("run_id", runId)
    .input("tol", tolerance)
    .query(`
      BEGIN TRY
        BEGIN TRAN;

      INSERT INTO dbo.audit_findings (id, run_id, rule_code, severity, entity_type, entity_id, message, evidence_json)
      SELECT
        NEWID(), run_id, 'PAGA_SEM_DATA_REAL', 'WARN', 'PARCELA', parcela_id,
        'Existe vínculo bancário, mas data_real está nula.',
        NULL
      FROM dbo.audit_fact_parcelas
      WHERE run_id = @run_id AND has_vinculo_bancario = 1 AND data_pagamento_real IS NULL;

      INSERT INTO dbo.audit_findings (id, run_id, rule_code, severity, entity_type, entity_id, message, evidence_json)
      SELECT
        NEWID(), f.run_id, 'SEM_VINCULO_BANCARIO', 'WARN', 'PARCELA', f.parcela_id,
        'Parcela possui codigo_pagamento, mas não foi encontrado vínculo em movimento_bancario.',
        NULL
      FROM dbo.audit_fact_parcelas f
      INNER JOIN dbo.audit_raw_movimentos_detalhe md
        ON md.run_id = f.run_id AND md.parcela_id = f.parcela_id
      WHERE f.run_id = @run_id AND f.has_vinculo_bancario = 0 AND md.codigo_pagamento IS NOT NULL;

      INSERT INTO dbo.audit_findings (id, run_id, rule_code, severity, entity_type, entity_id, message, evidence_json)
      SELECT
        NEWID(), run_id, 'PENDENTE_CONCILIACAO', 'INFO', 'PARCELA', parcela_id,
        'Existe vínculo bancário, porém não conciliado (boolConciliado != 1).',
        NULL
      FROM dbo.audit_fact_parcelas
      WHERE run_id = @run_id AND has_vinculo_bancario = 1 AND (bool_conciliado IS NULL OR bool_conciliado <> 1);

      INSERT INTO dbo.audit_findings (id, run_id, rule_code, severity, entity_type, entity_id, message, evidence_json)
      SELECT
        NEWID(), run_id, 'VALOR_PAGO_DIVERGENTE', 'WARN', 'PARCELA', parcela_id,
        'Valor pago diverge do valor da parcela (tolerância aplicada).',
        CONCAT(
          '{"valor_parcela":', COALESCE(CONVERT(varchar(50), valor_parcela), 'null'),
          ',"valor_pago":', COALESCE(CONVERT(varchar(50), valor_pago), 'null'),
          ',"tolerancia":', CONVERT(varchar(50), @tol),
          '}'
        )
      FROM dbo.audit_fact_parcelas
      WHERE run_id = @run_id
        AND has_vinculo_bancario = 1
        AND valor_pago IS NOT NULL
        AND valor_parcela IS NOT NULL
        AND ABS(valor_pago - valor_parcela) > @tol;

      INSERT INTO dbo.audit_findings (id, run_id, rule_code, severity, entity_type, entity_id, message, evidence_json)
      SELECT
        NEWID(), md.run_id, 'ORFAOS', 'ERROR', 'PARCELA', md.parcela_id,
        'movimentos_detalhe sem movimento correspondente no snapshot.',
        NULL
      FROM dbo.audit_raw_movimentos_detalhe md
      LEFT JOIN dbo.audit_raw_movimentos m
        ON m.run_id = md.run_id AND m.movimento_id = md.movimento_id
      WHERE md.run_id = @run_id AND m.movimento_id IS NULL;

        COMMIT;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
      END CATCH
    `);
}

export async function runSnapshot(input: SnapshotRunInput) {
  const runId = crypto.randomUUID();
  await executeSnapshot(runId, input);
  return { runId };
}

/**
 * Inicia o snapshot em background e retorna imediatamente o runId.
 *
 * Útil em produção (Coolify/Traefik), onde requisições longas podem virar 504.
 * Acompanhe o status em /auditoria/snapshots.
 */
export async function queueSnapshot(input: SnapshotRunInput): Promise<{ runId: string }> {
  const audit = await getAuditFinPool();
  const runId = crypto.randomUUID();
  await ensureEtlSchema(audit);
  // Importante: em modo background, marcar como QUEUED evita "RUNNING" pendurado caso o worker morra/recicle.
  await insertRun(audit, runId, input, "QUEUED");

  // Fire-and-forget: mantém o processamento no Node runtime do `next start`.
  void executeSnapshot(runId, input, { skipInsert: true }).catch((err) => {
    console.error("[audit:snapshot] background failed", {
      runId,
      message: err instanceof Error ? err.message : String(err),
    });
  });

  return { runId };
}

async function executeSnapshot(
  runId: string,
  input: SnapshotRunInput,
  opts?: { skipInsert?: boolean }
): Promise<void> {
  const audit = await getAuditFinPool();
  const legacy = await getAuditLegacyPool();

  const start = startOfDayUtc(input.periodStart);
  const endExclusive = addDaysUtc(startOfDayUtc(input.periodEndInclusive), 1);

  const t0 = Date.now();
  console.info("[audit:snapshot] start", {
    runId,
    start: start.toISOString(),
    endExclusive: endExclusive.toISOString(),
    requestedBy: input.requestedBy.email,
    mode: opts?.skipInsert ? "background" : "sync",
  });

  try {
    await ensureEtlSchema(audit);
    if (!opts?.skipInsert) {
      await insertRun(audit, runId, input, "RUNNING");
    }
    // Se veio de queueSnapshot (QUEUED), promove para RUNNING aqui.
    await markRunRunning(audit, runId);

    const tDim0 = Date.now();
    await syncDimTipoMovimentoBancario(audit, legacy);
    console.info("[audit:snapshot] dims synced", { runId, ms: Date.now() - tDim0 });

    const tExtract0 = Date.now();
    const [
      movimentos,
      movimentos_detalhe,
      compras,
      pagamentos,
      pagamentos_detalhe,
      movimento_bancario,
      conta_bancaria,
      caixa_fechamento,
    ] = await Promise.all([
      extractRawMovimentosVencimento(legacy, start, endExclusive, input.legacyCompanyBranchCode),
      extractRawMovimentosDetalheVencimento(legacy, start, endExclusive, input.legacyCompanyBranchCode),
      extractRawComprasVencimento(legacy, start, endExclusive, input.legacyCompanyBranchCode),
      extractRawPagamentosVencimento(legacy, start, endExclusive, input.legacyCompanyBranchCode),
      extractRawPagamentosDetalheVencimento(legacy, start, endExclusive, input.legacyCompanyBranchCode),
      extractRawMovimentoBancarioVencimento(legacy, start, endExclusive, input.legacyCompanyBranchCode),
      extractRawContaBancaria(legacy, input.legacyCompanyBranchCode),
      extractFactCaixaFechamento(legacy, start, endExclusive, input.legacyCompanyBranchCode),
    ]);

    console.info("[audit:snapshot] extracted", {
      runId,
      ms: Date.now() - tExtract0,
      counts: {
        movimentos: movimentos.length,
        movimentos_detalhe: movimentos_detalhe.length,
        compras: compras.length,
        pagamentos: pagamentos.length,
        pagamentos_detalhe: pagamentos_detalhe.length,
        movimento_bancario: movimento_bancario.length,
        conta_bancaria: conta_bancaria.length,
        caixa_fechamento: caixa_fechamento.length,
      },
    });

    const tLoad0 = Date.now();
    await loadRawsToAudit(audit, runId, {
      movimentos,
      movimentos_detalhe,
      compras,
      pagamentos,
      pagamentos_detalhe,
      movimento_bancario,
      conta_bancaria,
      caixa_fechamento,
    });
    console.info("[audit:snapshot] raws loaded", { runId, ms: Date.now() - tLoad0 });

    const tTransform0 = Date.now();
    await transformFact(audit, runId);
    await generateFindingsP0(audit, runId);
    await transformCashflowDaily(audit, runId);
    console.info("[audit:snapshot] transformed", { runId, ms: Date.now() - tTransform0 });

    await finishRunSuccess(audit, runId);
    console.info("[audit:snapshot] success", { runId, ms: Date.now() - t0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    console.error("[audit:snapshot] failed", { runId, message });
    try {
      await finishRunFailed(audit, runId, message);
    } catch (e) {
      console.error("[audit:snapshot] failed to mark run as failed", {
        runId,
        message: e instanceof Error ? e.message : String(e),
      });
    }
    throw err;
  }
}
