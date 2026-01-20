/**
 * Página de chat com agentes IA.
 */

import { Metadata } from "next";
import { AgentChat } from "@/components/agents/AgentChat";

export const metadata: Metadata = {
  title: "Assistente IA | AuraCore",
  description: "Converse com os agentes IA do AuraCore",
};

const agentInfos = [
  {
    title: "Fiscal",
    description: "NFe, CTe, SPED, impostos",
    icon: "📋",
  },
  {
    title: "Financeiro",
    description: "Contas, fluxo de caixa",
    icon: "💰",
  },
  {
    title: "TMS",
    description: "Rotas, entregas, rastreamento",
    icon: "🚛",
  },
  {
    title: "CRM",
    description: "Leads, propostas, clientes",
    icon: "👥",
  },
  {
    title: "Contábil",
    description: "Lançamentos, fechamento",
    icon: "📊",
  },
  {
    title: "Frota",
    description: "Manutenção, combustível",
    icon: "🚗",
  },
  {
    title: "Estratégico",
    description: "BSC, PDCA, KPIs",
    icon: "🎯",
  },
];

function InfoCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function AgentsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Assistente IA</h1>
        <p className="text-muted-foreground">
          Converse com nossos agentes especializados em fiscal, financeiro, TMS,
          CRM, contábil, frota e estratégia.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chat principal */}
        <AgentChat
          title="Chat Geral"
          placeholder="Pergunte sobre qualquer área do sistema..."
          className="lg:col-span-2"
        />
      </div>

      {/* Info sobre agentes */}
      <div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {agentInfos.map((info) => (
          <InfoCard
            key={info.title}
            title={info.title}
            description={info.description}
            icon={info.icon}
          />
        ))}
      </div>
    </div>
  );
}
