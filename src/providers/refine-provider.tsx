"use client";

import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";
import dataProvider from "@/providers/data-provider";

/**
 * 🔄 REFINE PROVIDER
 * 
 * Configuração central do Refine com:
 * - Data Provider customizado (com interceptação de erros)
 * - Router Provider para Next.js App Router
 * - Recursos definidos (branches, business-partners, etc.)
 */

interface RefineProviderProps {
  children: React.ReactNode;
}

export function RefineProvider({ children }: RefineProviderProps) {
  return (
    <Refine
      routerProvider={routerProvider}
      dataProvider={dataProvider}
      resources={[
        {
          name: "branches",
          list: "/branches",
          create: "/branches/create",
          edit: "/branches/edit/:id",
          show: "/branches/show/:id",
          meta: {
            label: "Filiais",
            icon: "🏢",
          },
        },
        {
          name: "business-partners",
          list: "/business-partners",
          create: "/business-partners/create",
          edit: "/business-partners/edit/:id",
          show: "/business-partners/show/:id",
          meta: {
            label: "Parceiros de Negócio",
            icon: "🤝",
          },
        },
        {
          name: "products",
          list: "/products",
          create: "/products/create",
          edit: "/products/edit/:id",
          show: "/products/show/:id",
          meta: {
            label: "Produtos",
            icon: "📦",
          },
        },
        // Adicionar mais recursos conforme necessário
      ]}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
        useNewQueryKeys: true,
        projectId: "auracore-erp",
        disableTelemetry: true,
      }}
    >
      {children}
    </Refine>
  );
}



















