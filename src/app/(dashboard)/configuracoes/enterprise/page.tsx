"use client";

import { useState } from "react";
import Link from "next/link";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { 
  Building2, 
  UserCheck, 
  Scale, 
  Package, 
  Leaf, 
  Settings, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Database,
  Upload
} from "lucide-react";

const modules = [
  {
    id: 'backoffice',
    title: 'BACKOFFICE',
    description: 'Plano de Contas e Centros de Custo Departamentais',
    icon: Building2,
    color: 'orange',
    status: 'configured',
    items: [
      'Plano de Contas Backoffice',
      'Centros de Custo Departamentais',
      'Aprovadores por Alçada',
      'Regras de Rateio Automático'
    ],
    link: '/configuracoes/backoffice'
  },
  {
    id: 'rh',
    title: 'RH ESPECIALIZADO',
    description: 'Jornadas de Motoristas - Lei 13.103',
    icon: UserCheck,
    color: 'blue',
    status: 'configured',
    items: [
      'Configuração de Prêmios',
      'Alertas de Compliance',
      'Integração com Rastreamento',
      'Cálculo de Folha Variável'
    ],
    link: '/rh/motoristas/jornadas'
  },
  {
    id: 'fiscal',
    title: 'INTELIGÊNCIA FISCAL',
    description: 'Matriz Tributária e CIAP',
    icon: Scale,
    color: 'indigo',
    status: 'configured',
    items: [
      'Matriz Tributária',
      'Regras de Validação CT-e',
      'Configuração DIFAL/FCP',
      'CIAP - Fator de Apropriação'
    ],
    link: '/fiscal/matriz-tributaria'
  },
  {
    id: 'wms',
    title: 'WMS E FATURAMENTO',
    description: 'Billing Engine e Eventos Logísticos',
    icon: Package,
    color: 'green',
    status: 'configured',
    items: [
      'Tabela de Preços Logísticos',
      'Billing Engine - Eventos',
      'Aprovação de Pré-Faturas',
      'Integração NFS-e'
    ],
    link: '/wms/faturamento'
  },
  {
    id: 'esg',
    title: 'SUSTENTABILIDADE',
    description: 'Emissões de Carbono e ESG',
    icon: Leaf,
    color: 'emerald',
    status: 'configured',
    items: [
      'Fator de Emissão CO2',
      'Projetos de Compensação',
      'Relatórios ESG',
      'Metas de Redução'
    ],
    link: '/sustentabilidade/carbono'
  }
];

export default function ConfiguracoesEnterprisePage() {
  const [loading, setLoading] = useState(false);

  const handleRunSeed = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/run-enterprise-seed', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        alert(`✅ Seed executado!\n\n${data.message}`);
      } else {
        alert('❌ Erro: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro ao executar seed');
    } finally {
      setLoading(false);
    }
  };

  const handleFixStructure = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/fix-fiscal-matrix', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        alert(`✅ Estrutura corrigida!\n\n${data.message}`);
      } else {
        alert('❌ Erro: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro ao corrigir estrutura');
    } finally {
      setLoading(false);
    }
  };

  const handleRunMigration = async () => {
    try {
      setLoading(true);
      alert('⚙️ Migration seria executada aqui');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="p-8 space-y-8">
        <FadeIn>
          <div className="text-center mb-8">
            <GradientText className="text-5xl font-bold mb-4">
              ⚙️ Central de Configurações Enterprise
            </GradientText>
            <p className="text-gray-400 text-lg mb-6">Gestão Completa do Sistema</p>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={handleFixStructure}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg hover:scale-105 transition-transform flex items-center gap-2 text-yellow-400"
              >
                <Settings className="w-4 h-4" />
                1. Corrigir Estrutura
              </button>
              
              <ShimmerButton onClick={handleRunSeed} disabled={loading} className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                2. Executar Seed
              </ShimmerButton>
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              ⚠️ Execute &quot;Corrigir Estrutura&quot; PRIMEIRO, depois &quot;Executar Seed&quot;
            </p>
          </div>
        </FadeIn>

        <StaggerContainer>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {modules.map((module, index) => {
              const Icon = module.icon;
              const colorClasses: Record<string, string> = {
                orange: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
                blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
                indigo: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30',
                green: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
                emerald: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30'
              };

              const iconColorClasses: Record<string, string> = {
                orange: 'text-orange-400',
                blue: 'text-blue-400',
                indigo: 'text-indigo-400',
                green: 'text-green-400',
                emerald: 'text-emerald-400'
              };

              return (
                <FadeIn key={module.id} delay={0.1 * (index + 1)}>
                  <Link href={module.link}>
                    <GlassmorphismCard 
                      className={`p-6 border-2 bg-gradient-to-br ${colorClasses[module.color]} hover:scale-[1.02] transition-all duration-300 cursor-pointer group`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl bg-white/10 ${iconColorClasses[module.color]} group-hover:scale-110 transition-transform`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">{module.title}</h3>
                            <p className="text-sm text-gray-400">{module.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {module.status === 'configured' ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-400" />
                          )}
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        {module.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {module.status === 'configured' ? 'Configurado e Ativo' : 'Pendente Configuração'}
                        </span>
                        <button className="text-sm text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
                          Configurar
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </GlassmorphismCard>
                  </Link>
                </FadeIn>
              );
            })}
          </div>
        </StaggerContainer>

        {/* Status Geral */}
        <FadeIn delay={0.8}>
          <GlassmorphismCard className="p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <GradientText className="text-2xl font-bold">
                Sistema Enterprise 100% Operacional
              </GradientText>
            </div>
            <p className="text-gray-400">
              Todos os módulos Enterprise estão configurados e prontos para uso em produção.
            </p>
          </GlassmorphismCard>
        </FadeIn>
      </div>
    </PageTransition>
  );
}

