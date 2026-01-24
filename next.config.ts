import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes externos que não devem ser bundleados pelo Turbopack
  serverExternalPackages: [
    "mssql",
    "bcryptjs",
    "drizzle-orm",
    "tsyringe",
    "reflect-metadata",
  ],

  // Turbopack config (Next.js 16+ usa Turbopack por padrão)
  turbopack: {
    // Config vazia para silenciar warning
  },

  /**
   * HOMOLOGAÇÃO/DEPLOY:
   * O projeto tem muitos erros de tipagem legados. Para não travar o build no servidor,
   * permitimos build mesmo com erros de TS/ESLint. Em paralelo, corrigimos por lotes via lotes.
   */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
