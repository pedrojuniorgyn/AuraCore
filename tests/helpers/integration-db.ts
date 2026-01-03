/**
 * Integration Test Database Helper
 * E7.8 WMS Semana 4
 * 
 * Gerencia conexão com banco de teste e setup/teardown de dados
 */

import sql from 'mssql';

export interface TestDbConfig {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

const TEST_DB_CONFIG: TestDbConfig = {
  server: 'localhost',
  port: 14330, // docker-compose.test.yml
  database: 'AuraCoreTest',
  user: 'SA',
  password: 'Test@1234567890',
};

let connection: sql.ConnectionPool | null = null;

/**
 * Conecta ao banco de teste
 */
export async function connectTestDb(): Promise<sql.ConnectionPool> {
  if (connection && connection.connected) {
    return connection;
  }

  const config: sql.config = {
    server: TEST_DB_CONFIG.server,
    port: TEST_DB_CONFIG.port,
    database: TEST_DB_CONFIG.database,
    user: TEST_DB_CONFIG.user,
    password: TEST_DB_CONFIG.password,
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
  };

  connection = await sql.connect(config);
  return connection;
}

/**
 * Desconecta do banco de teste
 */
export async function disconnectTestDb(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
  }
}

/**
 * Cria o banco de teste se não existir
 */
export async function createTestDatabase(): Promise<void> {
  // Conectar ao master para criar o banco
  const masterConfig: sql.config = {
    server: TEST_DB_CONFIG.server,
    port: TEST_DB_CONFIG.port,
    database: 'master',
    user: TEST_DB_CONFIG.user,
    password: TEST_DB_CONFIG.password,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };

  const masterPool = await sql.connect(masterConfig);

  try {
    // Verificar se banco existe
    const result = await masterPool.query`
      SELECT database_id 
      FROM sys.databases 
      WHERE name = ${TEST_DB_CONFIG.database}
    `;

    if (!result.recordset || result.recordset.length === 0) {
      // Criar banco
      await masterPool.query`
        CREATE DATABASE ${sql.VarChar(TEST_DB_CONFIG.database)}
      `;
      console.log(`✅ Test database '${TEST_DB_CONFIG.database}' created`);
    }
  } finally {
    await masterPool.close();
  }
}

/**
 * Limpa todas as tabelas do WMS (para isolamento entre testes)
 */
export async function cleanWmsTables(): Promise<void> {
  const conn = await connectTestDb();

  try {
    // Desabilitar constraints temporariamente
    await conn.query`EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT all'`;

    // Deletar dados das tabelas WMS (na ordem correta para respeitar FKs)
    await conn.query`DELETE FROM wms_stock_movements`;
    await conn.query`DELETE FROM wms_inventory_counts`;
    await conn.query`DELETE FROM wms_stock_items`;
    await conn.query`DELETE FROM wms_locations`;

    // Reabilitar constraints
    await conn.query`EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all'`;

    console.log('✅ WMS tables cleaned');
  } catch (error) {
    console.error('❌ Error cleaning WMS tables:', error);
    throw error;
  }
}

/**
 * Executa as migrations do Drizzle no banco de teste
 */
export async function runTestMigrations(): Promise<void> {
  // Placeholder - em produção, executaria as migrations
  // Por ora, assumimos que as tabelas já existem
  console.log('✅ Test migrations ready');
}

/**
 * Seed de dados básicos para testes
 */
export async function seedTestData(): Promise<{
  warehouseId: string;
  locationId: string;
  productId: string;
}> {
  const conn = await connectTestDb();

  const warehouseId = 'wh-test-001';
  const locationId = 'loc-test-001';
  const productId = 'prod-test-001';

  try {
    // Inserir warehouse (location tipo WAREHOUSE)
    await conn.query`
      INSERT INTO wms_locations (
        id, code, name, type, warehouse_id, parent_id,
        capacity, capacity_unit, is_active,
        organization_id, branch_id,
        created_at, updated_at
      ) VALUES (
        ${warehouseId}, 'WH-TEST', 'Test Warehouse', 'WAREHOUSE', 
        ${warehouseId}, NULL,
        10000, 'UNIT', 1,
        1, 1,
        GETDATE(), GETDATE()
      )
    `;

    // Inserir location filho
    await conn.query`
      INSERT INTO wms_locations (
        id, code, name, type, warehouse_id, parent_id,
        capacity, capacity_unit, is_active,
        organization_id, branch_id,
        created_at, updated_at
      ) VALUES (
        ${locationId}, 'A-001', 'Aisle 1', 'AISLE', 
        ${warehouseId}, ${warehouseId},
        1000, 'UNIT', 1,
        1, 1,
        GETDATE(), GETDATE()
      )
    `;

    console.log('✅ Test data seeded');

    return { warehouseId, locationId, productId };
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

/**
 * Context para testes de integração
 */
export interface IntegrationTestContext {
  db: sql.ConnectionPool;
  testData: {
    warehouseId: string;
    locationId: string;
    productId: string;
  };
  cleanup: () => Promise<void>;
}

/**
 * Cria contexto para teste de integração
 */
export async function createIntegrationContext(): Promise<IntegrationTestContext> {
  // Conectar ao banco
  const db = await connectTestDb();

  // Limpar dados anteriores
  await cleanWmsTables();

  // Seed de dados básicos
  const testData = await seedTestData();

  return {
    db,
    testData,
    cleanup: async () => {
      await cleanWmsTables();
    },
  };
}

