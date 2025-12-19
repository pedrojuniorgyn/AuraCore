import type { ReactNode } from "react";
import { GroupedSidebar } from "@/components/layout/grouped-sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { FloatingDock } from "@/components/ui/floating-dock";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // 🔐 Onda 0 (P0): nenhuma tela do produto renderiza sem sessão.
  // Isso evita “entrar no sistema” (sidebar/menus) sem login.
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="h-full relative">
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] shadow-2xl shadow-purple-500/10">
        <GroupedSidebar />
      </div>
      <main className="md:pl-72 pb-24">
        <div className="px-4 py-8 sm:px-8 lg:px-12 h-full">
          <Breadcrumbs />
          {children}
        </div>
      </main>
      
      {/* 🎨 Floating Dock (macOS Style) */}
      <FloatingDock />
    </div>
  );
}



