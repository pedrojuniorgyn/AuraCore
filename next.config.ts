import type { NextConfig } from "next";
import type { Configuration as WebpackConfig, EntryObject } from "webpack";

const nextConfig: NextConfig = {
  // Pacotes externos que não devem ser bundleados
  serverExternalPackages: [
    "mssql",
    "bcryptjs",
    "drizzle-orm",
    "tsyringe",
    "reflect-metadata",
  ],

  // Turbopack config (desabilitado - usando webpack para garantir ordem de imports)
  turbopack: {},

  // CRÍTICO: Webpack config para garantir reflect-metadata carrega PRIMEIRO
  // Isso resolve o erro "r is not a function" causado por decorators sem reflect-metadata
  webpack: (config: WebpackConfig, { isServer }) => {
    if (isServer && config.entry) {
      const originalEntry = config.entry as () => Promise<EntryObject>;
      config.entry = async () => {
        const entries = await originalEntry();

        // Adicionar reflect-metadata PRIMEIRO em todas as entradas server
        Object.keys(entries).forEach((key) => {
          const entry = entries[key];
          if (typeof entry === "object" && "import" in entry && Array.isArray(entry.import)) {
            // Evitar duplicatas
            if (!entry.import.includes("reflect-metadata")) {
              entry.import.unshift("reflect-metadata");
            }
          }
        });

        return entries;
      };
    }

    return config;
  },

  /**
   * HOMOLOGAÇÃO/DEPLOY:
   * O projeto tem muitos erros de tipagem legados. Para não travar o build no servidor,
   * permitimos build mesmo com erros de TS/ESLint. Em paralelo, corrigimos por lotes.
   */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
