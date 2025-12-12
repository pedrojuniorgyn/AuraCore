import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const dbPort = Number(process.env.DB_PORT ?? "1433");
const dbEncrypt = (process.env.DB_ENCRYPT ?? "false") === "true";
const dbTrustServerCertificate = (process.env.DB_TRUST_CERT ?? "true") === "true";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "mssql",
  dbCredentials: {
    server: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME || "AuraCore",
    port: dbPort,
    options: {
      encrypt: dbEncrypt,
      trustServerCertificate: dbTrustServerCertificate,
    },
  },
} satisfies Config;
