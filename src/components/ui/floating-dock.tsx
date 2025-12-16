/**
 * Floating Dock (macOS Style)
 * 
 * Menu flutuante estilo macOS com ícones animados
 */

"use client";

import React, { useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  DollarSign, 
  Building2,
  Settings,
  type LucideIcon 
} from "lucide-react";

interface DockItem {
  title: string;
  icon: LucideIcon;
  href: string;
}

const dockItems: DockItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    title: "Parceiros",
    icon: Users,
    href: "/cadastros/parceiros",
  },
  {
    title: "Produtos",
    icon: Package,
    href: "/cadastros/produtos",
  },
  {
    title: "NFes",
    icon: FileText,
    href: "/fiscal/entrada-notas",
  },
  {
    title: "Financeiro",
    icon: DollarSign,
    href: "/financeiro/contas-pagar",
  },
  {
    title: "Filiais",
    icon: Building2,
    href: "/configuracoes/filiais",
  },
  {
    title: "Configurações",
    icon: Settings,
    href: "/configuracoes",
  },
];

function DockIcon({ item, mouseX }: { item: DockItem; mouseX: any }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

  const ref = React.useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className="relative flex items-center justify-center"
    >
      <Link href={item.href}>
        <motion.div
          className={cn(
            "flex aspect-square w-full items-center justify-center rounded-2xl",
            "backdrop-blur-md transition-colors",
            isActive
              ? "bg-gradient-to-br from-indigo-500/80 to-purple-600/80"
              : "bg-slate-800/80 hover:bg-slate-700/80"
          )}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <item.icon className="h-6 w-6 text-white" />
        </motion.div>
      </Link>

      {/* Tooltip */}
      <motion.div
        className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl"
        initial={{ opacity: 0, y: 10 }}
        whileHover={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {item.title}
        <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900" />
      </motion.div>

      {/* Active indicator */}
      {isActive && (
        <motion.div
          className="absolute -bottom-1 h-1 w-1 rounded-full bg-white"
          layoutId="activeDot"
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        />
      )}
    </motion.div>
  );
}

export function FloatingDock({ className }: { className?: string }) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
        className
      )}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <div className="flex items-end gap-2 rounded-3xl border border-white/10 bg-slate-900/30 px-4 py-3 backdrop-blur-2xl shadow-2xl">
        {dockItems.map((item) => (
          <DockIcon key={item.href} item={item} mouseX={mouseX} />
        ))}
      </div>

      {/* Separator line above dock */}
      <div className="absolute -top-8 left-0 right-0 mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </motion.div>
  );
}

/**
 * 🎛️ Floating Dock Toggle
 * 
 * Botão para mostrar/esconder o dock
 */
export function FloatingDockToggle() {
  const [isVisible, setIsVisible] = React.useState(true);

  return (
    <>
      {isVisible && <FloatingDock />}
      
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-slate-900/80 p-3 text-white shadow-xl backdrop-blur-md transition-all hover:scale-110"
        title={isVisible ? "Ocultar Dock" : "Mostrar Dock"}
      >
        {isVisible ? "◀" : "▶"}
      </button>
    </>
  );
}


















