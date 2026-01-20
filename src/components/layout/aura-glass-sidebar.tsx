"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Truck,
  BadgeDollarSign,
  Package,
  Upload,
  Wrench,
  Users,
  Map,
  Boxes,
  Building2,
  FileText,
  Calculator,
  TrendingUp,
  ClipboardList,
  Banknote,
  Receipt,
  Target,
  FileSpreadsheet,
  AlertCircle,
  ChevronDown,
  DollarSign,
  BookOpen,
  BarChart3,
  Layers,
  Leaf,
  Scale,
  Shield,
  UserCheck,
  Settings,
  Fuel,
  Droplets,
} from "lucide-react";
import { BranchSwitcher } from "./branch-switcher";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useState } from "react";
import { SpotlightEffect } from "@/components/ui/spotlight-effect";
import { GlowBorder } from "@/components/ui/glow-border";
import { PulsatingBadge } from "@/components/ui/pulsating-badge";
import { GridPattern } from "@/components/ui/animated-background";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface MenuGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: "Comercial & Vendas",
    icon: Target,
    color: "text-emerald-400",
    gradientFrom: "from-emerald-500/20",
    gradientTo: "to-green-500/20",
    items: [
      { title: "Cotações", href: "/comercial/cotacoes", icon: ClipboardList, badge: 0 },
      { title: "Tabelas de Frete", href: "/comercial/tabelas-frete", icon: FileSpreadsheet },
      { title: "Simulador de Frete", href: "/comercial/simulador", icon: Calculator },
    ],
  },
  {
    title: "Fiscal",
    icon: FileText,
    color: "text-blue-400",
    gradientFrom: "from-blue-500/20",
    gradientTo: "to-cyan-500/20",
    items: [
      { title: "Monitor de Documentos", href: "/fiscal/documentos", icon: FileText },
      { title: "Upload de XMLs", href: "/fiscal/upload-xml", icon: Upload },
      { title: "Categorias de NCM", href: "/fiscal/ncm-categorias", icon: FileSpreadsheet },
      { title: "CTe (Documentos)", href: "/fiscal/cte", icon: FileText, badge: 0 },
      { title: "Matriz Tributária", href: "/fiscal/matriz-tributaria", icon: FileSpreadsheet },
      { title: "CIAP - Créditos ICMS Ativo", href: "/fiscal/ciap", icon: Calculator },
      { title: "Créditos Fiscais PIS/COFINS", href: "/fiscal/creditos-tributarios", icon: DollarSign },
      { title: "Central SPED", href: "/fiscal/sped", icon: FileSpreadsheet },
      { title: "Centros de Custo", href: "/financeiro/centros-custo", icon: Target },
      { title: "Plano de Contas", href: "/financeiro/plano-contas", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Financeiro",
    icon: BadgeDollarSign,
    color: "text-purple-400",
    gradientFrom: "from-purple-500/20",
    gradientTo: "to-pink-500/20",
    items: [
      { title: "Dashboard DRE", href: "/financeiro/dre-dashboard", icon: TrendingUp },
      { title: "Contas a Pagar", href: "/financeiro/contas-pagar", icon: Receipt },
      { title: "Contas a Receber", href: "/financeiro/contas-receber", icon: Banknote },
      { title: "Categorias Financeiras", href: "/financeiro/categorias", icon: Target },
      { title: "Remessas Bancárias", href: "/financeiro/remessas", icon: Banknote },
      { title: "Radar DDA", href: "/financeiro/radar-dda", icon: AlertCircle },
      { title: "DRE", href: "/financeiro/dre", icon: TrendingUp },
      { title: "Faturamento Agrupado", href: "/financeiro/faturamento", icon: Receipt },
      { title: "Impostos Recuperáveis", href: "/financeiro/impostos-recuperaveis", icon: Calculator },
      { title: "Conciliação Bancária", href: "/financeiro/conciliacao", icon: Banknote },
      { title: "Fluxo de Caixa", href: "/financeiro/fluxo-caixa", icon: TrendingUp },
      { title: "BTG Pactual Banking", href: "/financeiro/btg-dashboard", icon: Banknote },
      { title: "BTG - Testes", href: "/financeiro/btg-testes", icon: Banknote },
      { title: "📋 DDA - Débitos", href: "/financeiro/dda", icon: FileText },
      { title: "Intercompany - Rateio", href: "/financeiro/intercompany", icon: Building2 },
    ],
  },
  {
    title: "TMS (Operação)",
    icon: Map,
    color: "text-pink-400",
    gradientFrom: "from-pink-500/20",
    gradientTo: "to-rose-500/20",
    items: [
      { title: "Viagens (Kanban)", href: "/tms/viagens", icon: Map },
      { title: "Repositório de Cargas", href: "/tms/repositorio-cargas", icon: Package },
      { title: "Ocorrências", href: "/tms/ocorrencias", icon: AlertCircle },
      { title: "Análise Margem por CTe", href: "/operacional/margem-cte", icon: BarChart3 },
      { title: "Gestão de Sinistros", href: "/operacional/sinistros", icon: Shield },
    ],
  },
  {
    title: "Gerencial",
    icon: BarChart3,
    color: "text-violet-400",
    gradientFrom: "from-violet-500/20",
    gradientTo: "to-purple-500/20",
    items: [
      { title: "Dashboard DRE Gerencial", href: "/gerencial/dre", icon: TrendingUp },
      { title: "Plano de Contas Gerencial (PCG)", href: "/gerencial/plano-contas", icon: BookOpen },
      { title: "Centros de Custo 3D", href: "/gerencial/centros-custo-3d", icon: Layers },
    ],
  },
  {
    title: "Gestão Estratégica",
    icon: Target,
    color: "text-rose-400",
    gradientFrom: "from-rose-500/20",
    gradientTo: "to-pink-500/20",
    items: [
      { title: "Dashboard Estratégico", href: "/strategic/dashboard", icon: LayoutDashboard },
      { title: "Mapa Estratégico (BSC)", href: "/strategic/map", icon: Layers },
      { title: "Objetivos", href: "/strategic/goals", icon: Target },
      { title: "KPIs", href: "/strategic/kpis", icon: TrendingUp },
      { title: "PDCA", href: "/strategic/pdca", icon: ClipboardList },
      { title: "Planos de Ação (5W2H)", href: "/strategic/action-plans", icon: ClipboardList },
      { title: "Análise SWOT", href: "/strategic/swot", icon: Scale },
      { title: "War Room", href: "/strategic/war-room", icon: AlertCircle },
    ],
  },
  {
    title: "Frota & Logística",
    icon: Truck,
    color: "text-amber-400",
    gradientFrom: "from-amber-500/20",
    gradientTo: "to-orange-500/20",
    items: [
      { title: "Veículos", href: "/frota/veiculos", icon: Truck },
      { title: "Motoristas", href: "/frota/motoristas", icon: Users },
      { title: "Documentação", href: "/frota/documentacao", icon: FileText },
      { title: "Pneus", href: "/frota/pneus", icon: Wrench },
      { title: "Planos de Manutenção", href: "/frota/manutencao/planos", icon: Wrench },
      { title: "Ordens de Serviço", href: "/frota/manutencao/ordens", icon: Wrench },
    ],
  },
  {
    title: "Backoffice",
    icon: Building2,
    color: "text-orange-400",
    gradientFrom: "from-orange-500/20",
    gradientTo: "to-red-500/20",
    items: [
      { title: "Dashboard Backoffice", href: "/configuracoes/backoffice", icon: Building2 },
    ],
  },
  {
    title: "RH Especializado",
    icon: UserCheck,
    color: "text-cyan-400",
    gradientFrom: "from-cyan-500/20",
    gradientTo: "to-blue-500/20",
    items: [
      { title: "Jornadas de Motoristas", href: "/rh/motoristas/jornadas", icon: UserCheck },
    ],
  },
  {
    title: "WMS & Armazenagem",
    icon: Package,
    color: "text-teal-400",
    gradientFrom: "from-teal-500/20",
    gradientTo: "to-emerald-500/20",
    items: [
      { title: "Billing Engine - Faturamento", href: "/wms/faturamento", icon: DollarSign },
    ],
  },
  {
    title: "Sustentabilidade (ESG)",
    icon: Leaf,
    color: "text-green-400",
    gradientFrom: "from-green-500/20",
    gradientTo: "to-emerald-500/20",
    items: [
      { title: "Dashboard de Carbono", href: "/sustentabilidade/carbono", icon: Leaf },
    ],
  },
  {
    title: "Cadastros",
    icon: Building2,
    color: "text-cyan-400",
    gradientFrom: "from-cyan-500/20",
    gradientTo: "to-teal-500/20",
    items: [
      { title: "Cadastros Gerais", href: "/cadastros/parceiros", icon: Users },
      { title: "Produtos", href: "/cadastros/produtos", icon: Package },
      { title: "Filiais", href: "/cadastros/filiais", icon: Building2 },
    ],
  },
  {
    title: "Configurações",
    icon: Wrench,
    color: "text-indigo-400",
    gradientFrom: "from-indigo-500/20",
    gradientTo: "to-purple-500/20",
    items: [
      { title: "Certificações Fiscais", href: "/configuracoes/fiscal", icon: FileText },
      { title: "Certificado Digital", href: "/configuracoes/certificado", icon: FileText },
      { title: "Usuários e Permissões", href: "/configuracoes/usuarios", icon: Users },
      { title: "Preferências", href: "/configuracoes", icon: Wrench },
      { title: "Central Enterprise", href: "/configuracoes/enterprise", icon: Settings },
    ],
  },
  {
    title: "Outros Módulos",
    icon: Boxes,
    color: "text-slate-400",
    gradientFrom: "from-slate-500/20",
    gradientTo: "to-gray-500/20",
    items: [
      { title: "WMS - Endereços", href: "/wms/enderecos", icon: Boxes },
      { title: "WMS - Movimentação", href: "/wms/movimentacao", icon: Package },
      { title: "WMS - Inventário", href: "/wms/inventario", icon: Package },
      { title: "Almoxarifado", href: "/almoxarifado", icon: Package },
      { title: "Recursos Humanos", href: "/rh", icon: Users },
    ],
  },
];

export function AuraGlassSidebar() {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "Comercial & Vendas",
    "Fiscal",
    "Financeiro",
    "TMS (Operação)",
    "Gerencial",
    "Backoffice",
    "RH Especializado",
    "WMS & Armazenagem",
    "Sustentabilidade (ESG)",
  ]);

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupTitle)
        ? prev.filter((g) => g !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Glass Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/90 to-slate-950/90 backdrop-blur-xl" />
      
      {/* Border Glow */}
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-purple-500/50 to-transparent" />
      
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 opacity-[0.03]">
        <GridPattern />
      </div>

      {/* Spotlight Effect */}
      <SpotlightEffect />

      {/* Content */}
      <div className="relative flex flex-col h-full z-10">
        {/* Header com Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-4 py-4 border-b border-white/5"
        >
          <Link href="/" className="flex items-center pl-2 mb-4 group">
            <div className="relative w-9 h-9 mr-3">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-lg opacity-60 blur-md group-hover:opacity-80 transition-opacity" />
              {/* Logo */}
              <div className="relative bg-gradient-to-br from-slate-900 to-black w-full h-full rounded-lg flex items-center justify-center border border-white/20 shadow-lg">
                <span className="font-bold text-white text-lg">A</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white">
                Aura Core
              </h1>
              <p className="text-[10px] text-purple-400/60 font-medium tracking-wider">
                ENTERPRISE TMS
              </p>
            </div>
          </Link>

          {/* Branch Switcher */}
          <div className="px-2">
            <BranchSwitcher />
          </div>
        </motion.div>

        {/* Dashboard (sempre visível) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="px-4 py-3 border-b border-white/5"
        >
          <Link
            href="/"
            className={cn(
              "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all overflow-hidden group",
              pathname === "/"
                ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white shadow-lg shadow-indigo-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            {pathname === "/" && (
              <>
                <GlowBorder color="rgba(99, 102, 241, 0.6)" intensity={0.4} />
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent" />
              </>
            )}
            <LayoutDashboard className={cn(
              "h-5 w-5 relative z-10 transition-transform group-hover:scale-110",
              pathname === "/" ? "text-indigo-400" : ""
            )} />
            <span className="font-semibold relative z-10">Dashboard</span>
          </Link>
        </motion.div>

        {/* Menu Items (Scrollable com Fade) */}
        <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {/* Top Fade Gradient */}
          <div className="sticky top-0 h-4 bg-gradient-to-b from-slate-950/90 to-transparent pointer-events-none -mt-3 -mx-4 z-20" />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-2"
          >
            {menuGroups.map((group, groupIndex) => {
              const isExpanded = expandedGroups.includes(group.title);
              const hasActiveItem = group.items.some((item) =>
                pathname.startsWith(item.href)
              );
              const GroupIcon = group.icon;

              return (
                <motion.div
                  key={group.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * groupIndex }}
                  className="mb-3"
                >
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group relative overflow-hidden",
                      "hover:bg-white/5",
                      hasActiveItem ? "bg-white/5" : ""
                    )}
                  >
                    {/* Subtle glow when active */}
                    {hasActiveItem && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${group.gradientFrom} ${group.gradientTo} opacity-50`} />
                    )}

                    <div className="flex items-center gap-3 relative z-10">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <GroupIcon className={cn("h-4 w-4", group.color)} />
                      </motion.div>
                      <span className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        hasActiveItem 
                          ? "bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-300"
                          : "text-zinc-400 group-hover:text-zinc-200"
                      )}>
                        {group.title}
                      </span>
                    </div>

                    <motion.div
                      animate={{ rotate: isExpanded ? 0 : -90 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    </motion.div>
                  </button>

                  {/* Group Items */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 mt-1 space-y-0.5 border-l border-gradient-to-b from-transparent via-zinc-700/30 to-transparent pl-3">
                          {group.items.map((item, itemIndex) => {
                            const isActive = pathname.startsWith(item.href);
                            const ItemIcon = item.icon;

                            return (
                              <motion.div
                                key={item.href}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  duration: 0.2,
                                  delay: 0.05 * itemIndex,
                                }}
                              >
                                <Link
                                  href={item.href}
                                  className={cn(
                                    "relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group overflow-hidden",
                                    isActive
                                      ? "bg-gradient-to-r from-white/15 to-white/5 text-white shadow-lg"
                                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                                  )}
                                >
                                  {/* Active Glow */}
                                  {isActive && (
                                    <>
                                      <div className={`absolute inset-0 bg-gradient-to-r ${group.gradientFrom} ${group.gradientTo}`} />
                                      <div className={`absolute left-0 inset-y-0 w-1 bg-gradient-to-b ${group.gradientFrom} ${group.gradientTo} shadow-lg shadow-current`} />
                                    </>
                                  )}

                                  <motion.div
                                    whileHover={{ scale: 1.15, rotate: isActive ? 0 : 5 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                    className="relative z-10"
                                  >
                                    <ItemIcon className={cn(
                                      "h-4 w-4 transition-colors",
                                      isActive 
                                        ? group.color 
                                        : `${group.color} opacity-60 group-hover:opacity-100`
                                    )} />
                                  </motion.div>

                                  <span className={cn(
                                    "relative z-10 transition-all",
                                    isActive ? "font-semibold" : "font-normal"
                                  )}>
                                    {item.title}
                                  </span>

                                  {item.badge !== undefined && item.badge > 0 && (
                                    <div className="ml-auto relative z-10">
                                      <PulsatingBadge count={item.badge} />
                                    </div>
                                  )}

                                  {/* Hover Glow */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </Link>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Bottom Fade Gradient */}
          <div className="sticky bottom-0 h-8 bg-gradient-to-t from-slate-950/90 to-transparent pointer-events-none -mb-3 -mx-4" />
        </div>

        {/* User Menu (Footer) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="px-4 py-3 border-t border-white/5 bg-gradient-to-b from-transparent to-slate-950/50"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 rounded-lg blur-sm" />
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="flex-1">
                <UserMenu />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Ambient Glow (bottom corner) */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-purple-500/5 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

