import { drizzle } from "drizzle-orm/node-mssql";
import sql from "mssql";
import * as schema from "./schema";

const connectionConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Singleton pattern para evitar múltiplas conexões em hot-reload
const globalForDb = global as unknown as { 
  conn: sql.ConnectionPool;
  isConnecting: boolean;
};

export const pool = globalForDb.conn || new sql.ConnectionPool(connectionConfig);

if (process.env.NODE_ENV !== "production") globalForDb.conn = pool;

// Função para garantir conexão antes de usar
export const ensureConnection = async () => {
  if (pool.connected) {
    return pool;
  }

  if (pool.connecting || globalForDb.isConnecting) {
    // Aguarda a conexão em andamento
    let attempts = 0;
    while ((pool.connecting || globalForDb.isConnecting) && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    if (pool.connected) {
      return pool;
    }
  }

  // Inicia nova conexão
  globalForDb.isConnecting = true;
  try {
    await pool.connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  } finally {
    globalForDb.isConnecting = false;
  }

  return pool;
};

// Conecta no startup (sem await para não bloquear)
ensureConnection().catch((err) => console.error("Falha na conexão DB inicial:", err));

export const db = drizzle({ client: pool, schema });

export const getDb = async () => {
  await ensureConnection();
  return db;
};
