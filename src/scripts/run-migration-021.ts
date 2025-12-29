import sql from "mssql";

const config: sql.config = {
  server: process.env.DATABASE_HOST || "localhost",
  database: process.env.DATABASE_NAME || "aura_core",
  user: process.env.DATABASE_USER!,
  password: process.env.DATABASE_PASSWORD!,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 60000,
  connectionTimeout: 30000,
};

async function runMigration() {
  console.log("🚀 Executando Migration 0021: Integração Centros de Custo...\n");

  try {
    const pool = await sql.connect(config);

    // 1. Adicionar cost_center_id em journal_entry_lines
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('journal_entry_lines') 
          AND name = 'cost_center_id'
      )
      BEGIN
        ALTER TABLE journal_entry_lines ADD cost_center_id INT NULL;
        PRINT '✅ Coluna cost_center_id adicionada em journal_entry_lines';
      END
    `);

    // 2. FK journal_entry_lines
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys 
        WHERE name = 'FK_journal_entry_lines_cost_center'
      )
      BEGIN
        ALTER TABLE journal_entry_lines
        ADD CONSTRAINT FK_journal_entry_lines_cost_center
        FOREIGN KEY (cost_center_id) REFERENCES financial_cost_centers(id);
        PRINT '✅ FK cost_center_id adicionada em journal_entry_lines';
      END
    `);

    // 3. Índice journal_entry_lines
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE name = 'idx_journal_entry_lines_cost_center'
      )
      BEGIN
        CREATE INDEX idx_journal_entry_lines_cost_center 
        ON journal_entry_lines(cost_center_id);
        PRINT '✅ Índice idx_journal_entry_lines_cost_center criado';
      END
    `);

    // 4. Adicionar cost_center_id em fiscal_document_items
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('fiscal_document_items') 
          AND name = 'cost_center_id'
      )
      BEGIN
        ALTER TABLE fiscal_document_items ADD cost_center_id INT NULL;
        PRINT '✅ Coluna cost_center_id adicionada em fiscal_document_items';
      END
    `);

    // 5. FK fiscal_document_items
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys 
        WHERE name = 'FK_fiscal_document_items_cost_center'
      )
      BEGIN
        ALTER TABLE fiscal_document_items
        ADD CONSTRAINT FK_fiscal_document_items_cost_center
        FOREIGN KEY (cost_center_id) REFERENCES financial_cost_centers(id);
        PRINT '✅ FK cost_center_id adicionada em fiscal_document_items';
      END
    `);

    // 6. Índice fiscal_document_items
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes 
        WHERE name = 'idx_fiscal_document_items_cost_center'
      )
      BEGIN
        CREATE INDEX idx_fiscal_document_items_cost_center 
        ON fiscal_document_items(cost_center_id);
        PRINT '✅ Índice idx_fiscal_document_items_cost_center criado';
      END
    `);

    console.log("\n✅ Migration 0021 executada com sucesso!");
    console.log("\n📊 Alterações aplicadas:");
    console.log("   ✅ journal_entry_lines.cost_center_id");
    console.log("   ✅ fiscal_document_items.cost_center_id");
    console.log("   ✅ Foreign Keys criadas");
    console.log("   ✅ Índices de performance criados");

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();

























