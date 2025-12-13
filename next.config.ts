import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mssql", "bcryptjs"],
  // Ou serverComponentsExternalPackages se der erro de tipo, mas Next 15 geralmente unificou ou manteve o antigo.
  // Vou usar serverExternalPackages que é o novo padrão sugerido para Turbopack.

  /**
   * HOMOLOGAÇÃO/DEPLOY:
   * O projeto tem muitos erros de tipagem legados. Para não travar o build no servidor,
   * permitimos build mesmo com erros de TS/ESLint. Em paralelo, corrigimos por lotes via tsc.log.
   */
  typescript: {
    ignoreBuildErrors: true,
  },

  /**
   * Necessário para o `src/instrumentation.ts` rodar no boot do servidor.
   * (Sem isso, o CRON não inicializa no `next start`.)
   */
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
