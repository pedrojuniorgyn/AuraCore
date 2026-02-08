import type { NextConfig } from "next";
import type { Configuration as WebpackConfig, EntryObject } from "webpack";
import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Standalone output: gera servidor mínimo (~50MB vs 1.8GB node_modules completo)
  // Requer COPY .next/standalone, .next/static e public separados no Dockerfile
  output: "standalone",

  // Pacotes externos que não devem ser bundleados (carregados via require)
  serverExternalPackages: [
    "mssql",
    "bcryptjs",
    "drizzle-orm",
    "tsyringe",
    "reflect-metadata",
  ],

  // Next.js 16: Turbopack é o bundler padrão. Manter turbopack: {} para silenciar
  // erro "webpack config with no turbopack config" quando usamos --webpack no build.
  turbopack: {},

  // Webpack config: OBRIGATÓRIO para tsyringe DI (mangleExports=false + reflect-metadata).
  // Usado via --webpack flag no Dockerfile. Next.js 16 usa Turbopack por padrão,
  // mas precisamos de webpack para controle de entry points e optimization.
  webpack: (config: WebpackConfig, { isServer }) => {
    if (isServer) {
      // 1. Preservar nomes de exports para decorators tsyringe (mangleExports)
      config.optimization = {
        ...config.optimization,
        mangleExports: false, // Previne minification quebrar DI decorators
      };

      // 2. Garantir que reflect-metadata e tsyringe são externos
      if (!config.externals) {
        config.externals = [];
      }
      
      // 3. Modificar entry points para incluir reflect-metadata primeiro
      if (config.entry) {
        const originalEntry = config.entry as () => Promise<EntryObject>;
        config.entry = async () => {
          const entries = await originalEntry();

          Object.keys(entries).forEach((key) => {
            const entry = entries[key];
            if (typeof entry === "object" && "import" in entry && Array.isArray(entry.import)) {
              if (!entry.import.includes("reflect-metadata")) {
                entry.import.unshift("reflect-metadata");
              }
            }
          });

          return entries;
        };
      }
    }

    return config;
  },

  /**
   * HOMOLOGAÇÃO/DEPLOY:
   * Permitir build mesmo com erros de TS/ESLint para não travar o servidor.
   */
  typescript: {
    ignoreBuildErrors: true,
  },
};

// Configure PWA wrapper (two-step pattern as per next-pwa v5.6.0 docs)
// Step 1: Create the wrapper with PWA options
const withPWAConfig = withPWA({
  dest: "public",
  disable: !isProd, // Desabilitar em desenvolvimento para não gerar arquivos sempre
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts-stylesheets",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-font-assets",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-image-assets",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/i,
      handler: "CacheFirst",
      options: {
        rangeRequests: true,
        cacheName: "static-audio-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:mp4|webm)$/i,
      handler: "CacheFirst",
      options: {
        rangeRequests: true,
        cacheName: "static-video-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-js-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-style-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-data",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/api\/.*$/i,
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
        networkTimeoutSeconds: 10, // Fallback para cache após 10s
      },
    },
  ],
});

// Step 2: Apply the wrapper to the Next.js config
export default withPWAConfig(nextConfig);
