"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDynamicBreadcrumbLabel } from "@/hooks/useDynamicBreadcrumbLabel";

// Mapa de rotas para nomes legíveis
const routeNames: Record<string, string> = {
  // Dashboard
  "": "Dashboard",
  "perfil": "Meu Perfil",
  
  // Cadastros
  "cadastros": "Cadastros",
  "parceiros": "Parceiros",
  "produtos": "Produtos",
  "filiais": "Filiais",
  
  // Comercial
  "comercial": "Comercial",
  "crm": "CRM / Leads",
  "propostas": "Propostas",
  "cotacoes": "Cotações",
  "tabelas-frete": "Tabelas de Frete",
  "simulador": "Simulador de Frete",
  
  // Financeiro
  "financeiro": "Financeiro",
  "contas-pagar": "Contas a Pagar",
  "contas-receber": "Contas a Receber",
  "plano-contas": "Plano de Contas",
  "centros-custo": "Centros de Custo",
  "dre": "DRE",
  "dre-dashboard": "Dashboard DRE",
  "fluxo-caixa": "Fluxo de Caixa",
  "conciliacao": "Conciliação Bancária",
  "remessas": "Remessas Bancárias",
  "radar-dda": "Radar DDA",
  "dda": "DDA Inbox",
  "faturamento": "Faturamento",
  "categorias": "Categorias",
  "impostos-recuperaveis": "Impostos Recuperáveis",
  "intercompany": "Operações Intercompany",
  "btg-dashboard": "Dashboard BTG",
  "btg-testes": "Testes BTG",
  "nova": "Nova",
  
  // Fiscal
  "fiscal": "Fiscal",
  "documentos": "Monitor de Documentos",
  "cte": "CT-e",
  "inutilizacao": "Inutilização",
  "matriz-tributaria": "Matriz Tributária",
  "ciap": "CIAP",
  "creditos-tributarios": "Créditos Tributários",
  "ncm-categorias": "Categorias NCM",
  "sped": "SPED Fiscal",
  "upload-xml": "Upload XML",
  
  // Frota
  "frota": "Frota",
  "veiculos": "Veículos",
  "motoristas": "Motoristas",
  "documentacao": "Documentação",
  "manutencao": "Manutenção",
  "planos": "Planos de Manutenção",
  "ordens": "Ordens de Manutenção",
  "pneus": "Gestão de Pneus",
  "novo": "Novo",
  "editar": "Editar",
  
  // TMS
  "tms": "TMS",
  "cockpit": "Cockpit Operacional",
  "torre-controle": "Torre de Controle",
  "repositorio-cargas": "Repositório de Cargas",
  "viagens": "Viagens",
  "ocorrencias": "Ocorrências",
  
  // WMS
  "wms": "WMS",
  "enderecos": "Endereçamento",
  "inventario": "Inventário",
  
  // Gerencial
  "gerencial": "Gerencial",
  "centros-custo-3d": "Centros de Custo 3D",
  
  // Operacional
  "operacional": "Operacional",
  "margem-cte": "Margem por CT-e",
  "sinistros": "Gestão de Sinistros",
  
  // RH
  "rh": "Recursos Humanos",
  "jornadas": "Jornadas",
  
  // Sustentabilidade
  "sustentabilidade": "Sustentabilidade",
  "carbono": "Pegada de Carbono",

  // Gestão Estratégica
  "strategic": "Gestão Estratégica",
  "dashboard": "Dashboard",
  "goals": "Objetivos (BSC)",
  "kpis": "KPIs",
  "okrs": "OKRs",
  "action-plans": "Planos de Ação",
  "pdca": "PDCA",
  "swot": "Análise SWOT",
  "war-room": "War Room",
  "map": "Mapa BSC",
  "analytics": "Analytics",
  "reports": "Relatórios",
  "ideas": "Caixa de Ideias",
  "leaderboard": "Ranking",
  "achievements": "Conquistas",
  "templates": "Templates",
  "integrations": "Integrações",
  "audit": "Auditoria",
  "audit-log": "Log de Auditoria",
  "settings": "Configurações",

  // Configurações
  "configuracoes": "Configurações",
  "backoffice": "Backoffice",
  "certificado": "Certificado Digital",
  "enterprise": "Enterprise",
  "usuarios": "Usuários",

  // Ações comuns
  "create": "Criar",
  "edit": "Editar",
  "baixar": "Baixar",
  "new": "Novo",
};

interface BreadcrumbsProps {
  className?: string;
}

/**
 * Componente interno que resolve o label de um breadcrumb dinamicamente
 */
function BreadcrumbLabel({
  segment,
  pathname,
  fallbackLabel,
}: {
  segment: string;
  pathname: string;
  fallbackLabel: string;
}) {
  const { label, isLoading } = useDynamicBreadcrumbLabel(segment, pathname);

  if (isLoading) {
    return <span className="opacity-50">{fallbackLabel}</span>;
  }

  return <span>{label}</span>;
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Dividir o path em segmentos
  const segments = pathname.split("/").filter(Boolean);

  // Se estiver na home, não mostra breadcrumbs
  if (segments.length === 0) {
    return null;
  }

  // Construir breadcrumbs
  const breadcrumbs: Array<{
    label: string;
    href: string;
    segment: string;
    isDynamic: boolean;
  }> = [
    { label: "Dashboard", href: "/", segment: "", isDynamic: false },
  ];

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Pular IDs numéricos (rotas dinâmicas antigas)
    if (!isNaN(Number(segment))) {
      return;
    }

    const isLast = index === segments.length - 1;

    // Verificar se é UUID (rota dinâmica)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isDynamic = uuidRegex.test(segment);

    if (isDynamic) {
      // Para UUIDs, usar label genérico como fallback
      const fallbackLabel = segment.slice(0, 8) + '…';
      breadcrumbs.push({
        label: fallbackLabel,
        href: isLast ? "" : currentPath,
        segment,
        isDynamic: true,
      });
    } else {
      // Para segmentos normais, usar o mapa de nomes
      const label = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({
        label,
        href: isLast ? "" : currentPath,
        segment,
        isDynamic: false,
      });
    }
  });

  return (
    <nav className={cn("flex items-center space-x-2 text-sm text-muted-foreground mb-6", className)}>
      <Link
        href="/"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.slice(1).map((crumb, index) => (
        <div key={`${crumb.segment}-${index}`} className="flex items-center space-x-2">
          <ChevronRight className="h-4 w-4" />
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.isDynamic ? (
                <BreadcrumbLabel
                  segment={crumb.segment}
                  pathname={pathname}
                  fallbackLabel={crumb.label}
                />
              ) : (
                crumb.label
              )}
            </Link>
          ) : (
            <span className="text-foreground font-medium">
              {crumb.isDynamic ? (
                <BreadcrumbLabel
                  segment={crumb.segment}
                  pathname={pathname}
                  fallbackLabel={crumb.label}
                />
              ) : (
                crumb.label
              )}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}























