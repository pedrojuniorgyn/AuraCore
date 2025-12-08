"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Truck,
  BadgeDollarSign,
  Package,
  Wrench,
  Users,
  Settings,
  Map,
  Boxes,
  Building2,
  FileText,
} from "lucide-react";
import { BranchSwitcher } from "./branch-switcher";
import { UserMenu } from "./user-menu";

const sidebarItems = [
  {
    title: "Cadastros Gerais",
    href: "/cadastros/parceiros",
    icon: Users,
    color: "text-cyan-500",
  },
  {
    title: "Produtos",
    href: "/cadastros/produtos",
    icon: Package,
    color: "text-purple-500",
  },
  {
    title: "Filiais",
    href: "/configuracoes/filiais",
    icon: Building2,
    color: "text-indigo-500",
  },
  {
    title: "Importar NFe",
    href: "/fiscal/entrada-notas",
    icon: BadgeDollarSign,
    color: "text-green-500",
  },
  {
    title: "Contas a Pagar",
    href: "/financeiro/contas-pagar",
    icon: BadgeDollarSign,
    color: "text-red-500",
  },
  {
    title: "Contas a Receber",
    href: "/financeiro/contas-receber",
    icon: BadgeDollarSign,
    color: "text-green-500",
  },
  {
    title: "Remessas Bancárias",
    href: "/financeiro/remessas",
    icon: BadgeDollarSign,
    color: "text-purple-500",
  },
  {
    title: "Radar DDA",
    href: "/financeiro/radar-dda",
    icon: BadgeDollarSign,
    color: "text-cyan-500",
  },
  {
    title: "Simulador de Frete",
    href: "/comercial/simulador",
    icon: BadgeDollarSign,
    color: "text-emerald-500",
  },
  {
    title: "Veículos",
    href: "/frota/veiculos",
    icon: Truck,
    color: "text-blue-500",
  },
  {
    title: "Motoristas",
    href: "/frota/motoristas",
    icon: Users,
    color: "text-indigo-500",
  },
  {
    title: "Centros de Custo",
    href: "/financeiro/centros-custo",
    icon: BadgeDollarSign,
    color: "text-orange-500",
  },
  {
    title: "Plano de Contas",
    href: "/financeiro/plano-contas",
    icon: BadgeDollarSign,
    color: "text-pink-500",
  },
  {
    title: "DRE",
    href: "/financeiro/dre",
    icon: BadgeDollarSign,
    color: "text-yellow-500",
  },
  {
    title: "Matriz Tributária",
    href: "/fiscal/matriz-tributaria",
    icon: BadgeDollarSign,
    color: "text-red-500",
  },
  {
    title: "CTe (Documentos)",
    href: "/fiscal/cte",
    icon: FileText,
    color: "text-purple-500",
  },
  {
    title: "Cotações",
    href: "/comercial/cotacoes",
    icon: Map,
    color: "text-green-500",
  },
  {
    title: "Viagens (TMS)",
    href: "/tms/viagens",
    icon: Map,
    color: "text-violet-500",
  },
  {
    title: "Dashboard DRE",
    href: "/financeiro/dre-dashboard",
    icon: BadgeDollarSign,
    color: "text-blue-500",
  },
  {
    title: "WMS (Armazém)",
    href: "/wms",
    icon: Boxes,
    color: "text-amber-500",
  },
  {
    title: "Manutenção",
    href: "/manutencao",
    icon: Wrench,
    color: "text-orange-500",
  },
  {
    title: "Almoxarifado",
    href: "/almoxarifado",
    icon: Package,
    color: "text-pink-500",
  },
  {
    title: "Recursos Humanos",
    href: "/rh",
    icon: Users,
    color: "text-cyan-500",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-card text-card-foreground border-r border-border">
      {/* Header com Logo */}
      <div className="px-3 py-2">
        <Link href="/" className="flex items-center pl-3 mb-6">
          <div className="relative w-8 h-8 mr-4">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-lg opacity-75 blur-sm"></div>
            <div className="relative bg-black w-full h-full rounded-lg flex items-center justify-center border border-white/10">
              <span className="font-bold text-white text-lg">A</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Aura Core
          </h1>
        </Link>

        {/* Branch Switcher */}
        <div className="px-3 mb-6">
          <BranchSwitcher />
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-3 py-2 flex-1">
        <div className="space-y-1">
          {sidebarItems.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname.startsWith(route.href)
                  ? "text-white bg-white/10"
                  : "text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.title}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* User Menu (Footer) */}
      <div className="px-3 py-2 border-t border-border">
        <UserMenu />
      </div>
    </div>
  );
}

