import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

/**
 * HOMOLOGAÇÃO/DEPLOY:
 * Evita pré-render (SSG) no build para rotas que dependem de search params/CSR bailout.
 * Isso elimina erros do tipo:
 * "useSearchParams() should be wrapped in a suspense boundary ..."
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aura Core | Enterprise Logistics",
  description: "Sistema de Gestão Logística Avançada",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}





