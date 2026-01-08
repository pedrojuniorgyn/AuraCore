"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  // Dashboard & Principal
  LayoutDashboard, Home, User,
  
  // Cadastros
  Users, Package, Building2, UserCircle, Briefcase,
  
  // Comercial
  DollarSign, TrendingUp, Calculator, MessageSquare, FileText as ProposalIcon, Table,
  
  // Financeiro
  BadgeDollarSign, CreditCard, Wallet, PieChart, BarChart3, Receipt, 
  Banknote, ArrowDownCircle, ArrowUpCircle, Building, Repeat, FileSpreadsheet,
  TrendingDown, DollarSign as MoneyIcon,
  
  // Fiscal
  FileText, File, Shield, Calculator as TaxCalc, Archive, Upload, BookOpen,
  Percent, ClipboardCheck, FileCheck,
  
  // Frota
  Truck, Users as DriversIcon, Wrench, Calendar, FileSignature, CircleDot,
  
  // TMS
  Map, MapPin, Navigation, Radio, Milestone, AlertCircle,
  
  // WMS
  Boxes, MapPinned, PackageCheck, ClipboardList,
  
  // Gerencial
  TrendingUp as ManagementIcon, Layers, Grid3x3, BarChart,
  
  // Operacional
  Activity, AlertTriangle, Target,
  
  // RH
  Users as HRIcon, Clock, UserCheck,
  
  // Sustentabilidade
  Leaf, TreePine, Recycle,
  
  // Configurações
  Settings, Sliders, Key, Database,
  
  // Navegação
  ChevronDown, ChevronRight, Star, History, Search,
} from "lucide-react";
import { BranchSwitcher } from "./branch-switcher";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTenant } from "@/contexts/tenant-context";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface SidebarGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: SidebarItem[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    color: "text-blue-400",
    items: [
      { title: "Painel Principal", href: "/", icon: Home, color: "text-blue-400" },
      { title: "Meu Perfil", href: "/perfil", icon: User, color: "text-purple-400" },
    ],
  },
  {
    title: "Cadastros",
    icon: Users,
    color: "text-cyan-400",
    items: [
      { title: "Parceiros", href: "/cadastros/parceiros", icon: Briefcase, color: "text-cyan-400" },
      { title: "Produtos", href: "/cadastros/produtos", icon: Package, color: "text-purple-400" },
      { title: "Filiais", href: "/cadastros/filiais", icon: Building2, color: "text-indigo-400" },
    ],
  },
  {
    title: "Comercial",
    icon: TrendingUp,
    color: "text-green-400",
    items: [
      { title: "CRM / Leads", href: "/comercial/crm", icon: MessageSquare, color: "text-blue-400" },
      { title: "Propostas", href: "/comercial/propostas", icon: ProposalIcon, color: "text-purple-400" },
      { title: "Cotações", href: "/comercial/cotacoes", icon: Calculator, color: "text-green-400" },
      { title: "Tabelas de Frete", href: "/comercial/tabelas-frete", icon: Table, color: "text-amber-400" },
      { title: "Simulador de Frete", href: "/comercial/simulador", icon: Calculator, color: "text-emerald-400" },
    ],
  },
  {
    title: "Financeiro",
    icon: BadgeDollarSign,
    color: "text-emerald-400",
    items: [
      { title: "Contas a Pagar", href: "/financeiro/contas-pagar", icon: ArrowDownCircle, color: "text-red-400" },
      { title: "Contas a Receber", href: "/financeiro/contas-receber", icon: ArrowUpCircle, color: "text-green-400" },
      { title: "Plano de Contas", href: "/financeiro/plano-contas", icon: FileSpreadsheet, color: "text-pink-400" },
      { title: "Centros de Custo", href: "/financeiro/centros-custo", icon: Target, color: "text-orange-400" },
      { title: "DRE", href: "/financeiro/dre", icon: BarChart3, color: "text-yellow-400" },
      { title: "Dashboard DRE", href: "/financeiro/dre-dashboard", icon: PieChart, color: "text-blue-400" },
      { title: "Fluxo de Caixa", href: "/financeiro/fluxo-caixa", icon: TrendingDown, color: "text-cyan-400" },
      { title: "Conciliação Bancária", href: "/financeiro/conciliacao", icon: Repeat, color: "text-violet-400" },
      { title: "Remessas Bancárias", href: "/financeiro/remessas", icon: Banknote, color: "text-purple-400" },
      { title: "Radar DDA", href: "/financeiro/radar-dda", icon: Radio, color: "text-cyan-400" },
      { title: "DDA Inbox", href: "/financeiro/dda", icon: Receipt, color: "text-blue-400" },
      { title: "Faturamento", href: "/financeiro/faturamento", icon: Receipt, color: "text-green-400" },
      { title: "Categorias", href: "/financeiro/categorias", icon: Layers, color: "text-amber-400" },
      { title: "Impostos Recuperáveis", href: "/financeiro/impostos-recuperaveis", icon: Percent, color: "text-rose-400" },
      { title: "Operações Intercompany", href: "/financeiro/intercompany", icon: Building, color: "text-indigo-400" },
      { title: "Dashboard BTG", href: "/financeiro/btg-dashboard", icon: BarChart, color: "text-sky-400" },
      { title: "Testes BTG", href: "/financeiro/btg-testes", icon: Activity, color: "text-slate-400" },
    ],
  },
  {
    title: "Fiscal",
    icon: Shield,
    color: "text-blue-400",
    items: [
      { title: "Monitor de Documentos", href: "/fiscal/documentos", icon: FileText, color: "text-blue-400" },
      { title: "CT-e", href: "/fiscal/cte", icon: File, color: "text-purple-400" },
      { title: "Inutilização CT-e", href: "/fiscal/cte/inutilizacao", icon: FileCheck, color: "text-red-400" },
      { title: "Matriz Tributária", href: "/fiscal/matriz-tributaria", icon: TaxCalc, color: "text-orange-400" },
      { title: "CIAP", href: "/fiscal/ciap", icon: Archive, color: "text-cyan-400" },
      { title: "Créditos Tributários", href: "/fiscal/creditos-tributarios", icon: Percent, color: "text-green-400" },
      { title: "Categorias NCM", href: "/fiscal/ncm-categorias", icon: Grid3x3, color: "text-pink-400" },
      { title: "SPED Fiscal", href: "/fiscal/sped", icon: BookOpen, color: "text-indigo-400" },
      { title: "Upload XML", href: "/fiscal/upload-xml", icon: Upload, color: "text-amber-400" },
    ],
  },
  {
    title: "Frota",
    icon: Truck,
    color: "text-orange-400",
    items: [
      { title: "Veículos", href: "/frota/veiculos", icon: Truck, color: "text-blue-400" },
      { title: "Motoristas", href: "/frota/motoristas", icon: DriversIcon, color: "text-indigo-400" },
      { title: "Documentação", href: "/frota/documentacao", icon: FileSignature, color: "text-purple-400" },
      { title: "Planos de Manutenção", href: "/frota/manutencao/planos", icon: Calendar, color: "text-green-400" },
      { title: "Ordens de Manutenção", href: "/frota/manutencao/ordens", icon: Wrench, color: "text-orange-400" },
      { title: "Gestão de Pneus", href: "/frota/pneus", icon: CircleDot, color: "text-cyan-400" },
    ],
  },
  {
    title: "TMS",
    icon: Map,
    color: "text-violet-400",
    items: [
      { title: "Cockpit Operacional", href: "/tms/cockpit", icon: Activity, color: "text-blue-400" },
      { title: "Torre de Controle", href: "/tms/torre-controle", icon: Radio, color: "text-cyan-400" },
      { title: "Repositório de Cargas", href: "/tms/repositorio-cargas", icon: Boxes, color: "text-purple-400" },
      { title: "Viagens", href: "/tms/viagens", icon: Navigation, color: "text-violet-400" },
      { title: "Ocorrências", href: "/tms/ocorrencias", icon: AlertCircle, color: "text-amber-400" },
    ],
  },
  {
    title: "WMS",
    icon: Boxes,
    color: "text-amber-400",
    items: [
      { title: "Endereçamento", href: "/wms/enderecos", icon: MapPinned, color: "text-blue-400" },
      { title: "Faturamento WMS", href: "/wms/faturamento", icon: Receipt, color: "text-green-400" },
      { title: "Inventário", href: "/wms/inventario", icon: ClipboardList, color: "text-purple-400" },
    ],
  },
  {
    title: "Gerencial",
    icon: ManagementIcon,
    color: "text-pink-400",
    items: [
      { title: "Plano de Contas Gerencial", href: "/gerencial/plano-contas", icon: FileSpreadsheet, color: "text-pink-400" },
      { title: "DRE Gerencial", href: "/gerencial/dre", icon: BarChart3, color: "text-purple-400" },
      { title: "Centros de Custo 3D", href: "/gerencial/centros-custo-3d", icon: Grid3x3, color: "text-cyan-400" },
    ],
  },
  {
    title: "Operacional",
    icon: Activity,
    color: "text-rose-400",
    items: [
      { title: "Margem por CT-e", href: "/operacional/margem-cte", icon: Target, color: "text-green-400" },
      { title: "Gestão de Sinistros", href: "/operacional/sinistros", icon: AlertTriangle, color: "text-red-400" },
    ],
  },
  {
    title: "RH",
    icon: HRIcon,
    color: "text-indigo-400",
    items: [
      { title: "Jornadas de Motoristas", href: "/rh/motoristas/jornadas", icon: Clock, color: "text-blue-400" },
    ],
  },
  {
    title: "Sustentabilidade",
    icon: Leaf,
    color: "text-green-500",
    items: [
      { title: "Pegada de Carbono", href: "/sustentabilidade/carbono", icon: TreePine, color: "text-green-400" },
    ],
  },
  {
    title: "Configurações",
    icon: Settings,
    color: "text-slate-400",
    items: [
      { title: "Dashboard Config", href: "/configuracoes", icon: LayoutDashboard, color: "text-slate-400" },
      { title: "Operações (Smoke Tests)", href: "/configuracoes/operacoes", icon: Activity, color: "text-cyan-400" },
      { title: "Auditoria", href: "/auditoria", icon: ClipboardCheck, color: "text-amber-400" },
      { title: "Document Pipeline", href: "/configuracoes/documentos", icon: FileText, color: "text-cyan-400" },
      { title: "Filiais", href: "/configuracoes/filiais", icon: Building2, color: "text-indigo-400" },
      { title: "Backoffice", href: "/configuracoes/backoffice", icon: Sliders, color: "text-purple-400" },
      { title: "Certificado Digital", href: "/configuracoes/certificado", icon: Key, color: "text-amber-400" },
      { title: "Configurações Fiscais", href: "/configuracoes/fiscal", icon: Shield, color: "text-blue-400" },
      { title: "Enterprise", href: "/configuracoes/enterprise", icon: Database, color: "text-cyan-400" },
      { title: "Usuários", href: "/configuracoes/usuarios", icon: Users, color: "text-green-400" },
    ],
  },
];

export function GroupedSidebar() {
  const pathname = usePathname();
  const { user } = useTenant();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  
  // Lazy initialization: carregar do localStorage apenas uma vez
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("aura-favorites");
    return stored ? JSON.parse(stored) : [];
  });
  
  const [recentPages, setRecentPages] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("aura-recent-pages");
    return stored ? JSON.parse(stored) : [];
  });
  
  const [searchQuery, setSearchQuery] = useState("");

  // Expandir grupo atual automaticamente
  useEffect(() => {
    const currentGroup = sidebarGroups.find(group =>
      group.items.some(item => pathname.startsWith(item.href) && item.href !== "/")
    );
    
    if (!currentGroup) return;
    
    // Usar setTimeout para evitar setState síncrono em effect (cascading renders)
    const timeoutId = setTimeout(() => {
      setExpandedGroups(prev => {
        // Se já está expandido, não faz nada
        if (prev.includes(currentGroup.title)) {
          return prev;
        }
        // Adiciona o grupo atual
        return [...prev, currentGroup.title];
      });
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [pathname]); // pathname é suficiente

  // Adicionar página aos recentes (debounced)
  useEffect(() => {
    if (pathname === "/" || recentPages.includes(pathname)) return;
    
    // Usar setTimeout para evitar setState síncrono
    const timeoutId = setTimeout(() => {
      const updated = [pathname, ...recentPages.slice(0, 9)];
      setRecentPages(updated);
      localStorage.setItem("aura-recent-pages", JSON.stringify(updated));
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [pathname, recentPages]);

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupTitle)
        ? prev.filter(g => g !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  const toggleFavorite = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const updated = favorites.includes(href)
      ? favorites.filter(f => f !== href)
      : [...favorites, href];
    
    setFavorites(updated);
    localStorage.setItem("aura-favorites", JSON.stringify(updated));
  };

  const getFavoriteItems = (): SidebarItem[] => {
    const items: SidebarItem[] = [];
    sidebarGroups.forEach(group => {
      group.items.forEach(item => {
        if (favorites.includes(item.href)) {
          items.push(item);
        }
      });
    });
    return items;
  };

  const getRecentItems = (): SidebarItem[] => {
    const items: SidebarItem[] = [];
    recentPages.forEach(path => {
      sidebarGroups.forEach(group => {
        const item = group.items.find(i => i.href === path);
        if (item && !items.find(i => i.href === item.href)) {
          items.push(item);
        }
      });
    });
    return items.slice(0, 5);
  };

  const getFilteredGroups = () => {
    const baseGroups = sidebarGroups;
    if (!searchQuery) return baseGroups;
    
    return baseGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter(group => group.items.length > 0);
  };

  const favoriteItems = getFavoriteItems();
  const recentItems = getRecentItems();
  const filteredGroups = getFilteredGroups();

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
        <div className="px-3 mb-4">
          <BranchSwitcher />
        </div>

        {/* Search */}
        <div className="px-3 mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tela..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-background/50"
            />
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-4">
          {/* Favoritos */}
          {favoriteItems.length > 0 && !searchQuery && (
            <div className="space-y-1">
              <div className="px-3 py-2 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Favoritos
                </h3>
              </div>
              {favoriteItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm group flex items-center gap-2 p-2 px-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                      pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                        ? "text-white bg-white/10"
                        : "text-zinc-400"
                    )}
                  >
                    <ItemIcon className={cn("h-4 w-4", item.color)} />
                    <span className="flex-1 truncate">{item.title}</span>
                    <Star
                      className="h-3 w-3 text-yellow-400 fill-yellow-400 opacity-0 group-hover:opacity-100 transition"
                      onClick={(e) => toggleFavorite(item.href, e)}
                    />
                  </Link>
                );
              })}
            </div>
          )}

          {/* Recentes */}
          {recentItems.length > 0 && !searchQuery && (
            <div className="space-y-1">
              <div className="px-3 py-2 flex items-center gap-2">
                <History className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Recentes
                </h3>
              </div>
              {recentItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm group flex items-center gap-2 p-2 px-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                      pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                        ? "text-white bg-white/10"
                        : "text-zinc-400"
                    )}
                  >
                    <ItemIcon className={cn("h-4 w-4", item.color)} />
                    <span className="flex-1 truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Grupos */}
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.title);
            const isActive = group.items.some(item => 
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
            );
            const GroupIcon = group.icon;

            return (
              <div key={group.title} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-2 text-sm font-semibold rounded-lg transition hover:bg-white/5",
                    isActive ? "text-white" : "text-zinc-400"
                  )}
                >
                  <GroupIcon className={cn("h-4 w-4", group.color)} />
                  <span className="flex-1 text-left">{group.title}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {isExpanded && (
                  <div className="space-y-1 pl-3">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "text-sm group flex items-center gap-2 p-2 px-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                              ? "text-white bg-white/10"
                              : "text-zinc-400"
                          )}
                        >
                          <ItemIcon className={cn("h-4 w-4", item.color)} />
                          <span className="flex-1 truncate">{item.title}</span>
                          <Star
                            className={cn(
                              "h-3 w-3 transition",
                              favorites.includes(item.href)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-zinc-600 opacity-0 group-hover:opacity-100"
                            )}
                            onClick={(e) => toggleFavorite(item.href, e)}
                          />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* User Menu (Footer) */}
      <div className="px-3 py-2 border-t border-border">
        <UserMenu />
      </div>
    </div>
  );
}







