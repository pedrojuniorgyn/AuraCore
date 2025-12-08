"use client";

import * as React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TenantProvider } from "@/contexts/tenant-context";
import { RefineProvider } from "@/providers/refine-provider";
import { Toaster } from "@/components/ui/toaster";

// Configurar AG Grid globalmente (registrar módulos Community)
import "@/lib/ag-grid-config";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RefineProvider>
        <NuqsAdapter>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <TenantProvider>
              {children}
              <Toaster />
            </TenantProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </RefineProvider>
    </SessionProvider>
  );
}

