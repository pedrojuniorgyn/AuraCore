import { AuraGlassSidebar } from "@/components/layout/aura-glass-sidebar";
import { FloatingDock } from "@/components/ui/floating-dock";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full relative">
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] shadow-2xl shadow-purple-500/10">
        <AuraGlassSidebar />
      </div>
      <main className="md:pl-72 pb-24">
        <div className="px-4 py-8 sm:px-8 lg:px-12 h-full">{children}</div>
      </main>
      
      {/* 🎨 Floating Dock (macOS Style) */}
      <FloatingDock />
    </div>
  );
}



