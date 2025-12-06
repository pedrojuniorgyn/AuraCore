import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "mssql",
  dbCredentials: {
    server: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME || "AuraCore",
    port: 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  },
} satisfies Config;
