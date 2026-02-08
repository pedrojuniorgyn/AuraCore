import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PWAManager } from "@/components/pwa";

const inter = Inter({ subsets: ["latin"] });

/**
 * HOMOLOGAÇÃO/DEPLOY:
 * Evita pré-render (SSG) no build para rotas que dependem de search params/CSR bailout.
 * Isso elimina erros do tipo:
 * "useSearchParams() should be wrapped in a suspense boundary ..."
 */
export const dynamic = "force-dynamic";

/**
 * Next.js 15: viewport e themeColor DEVEM estar em export separado.
 * Manter dentro de metadata causa hydration mismatch (React Error #418).
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-viewport
 */
export const viewport: Viewport = {
  themeColor: "#667eea",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "AuraCore | ERP Logístico Enterprise",
  description: "Sistema de Gestão Logística Avançada com Strategic Management, TMS, WMS e Fiscal",
  applicationName: "AuraCore ERP",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AuraCore ERP",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AuraCore" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* theme-color gerenciado pelo export viewport acima - nao duplicar */}
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <PWAManager />
        </Providers>
      </body>
    </html>
  );
}





