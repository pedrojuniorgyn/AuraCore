import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mssql", "bcryptjs"],
  // Ou serverComponentsExternalPackages se der erro de tipo, mas Next 15 geralmente unificou ou manteve o antigo.
  // Vou usar serverExternalPackages que é o novo padrão sugerido para Turbopack.
};

export default nextConfig;
