import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import "@/lib/cron-setup"; // Inicializa cron jobs

const inter = Inter({ subsets: ["latin"] });

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





