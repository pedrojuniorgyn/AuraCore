"use client";

import { useState, useEffect } from "react";
import { DollarSign, QrCode, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";

interface DashboardStats {
  boletosAtivos: number;
  boletosPagos: number;
  pixAtivos: number;
  pixPagos: number;
  valorTotal: number;
}

export default function BTGDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    boletosAtivos: 0,
    boletosPagos: 0,
    pixAtivos: 0,
    pixPagos: 0,
    valorTotal: 0,
  });
  interface BTGHealth {
    success: boolean;
    environment?: string;
    apiUrl?: string;
  }
  const [health, setHealth] = useState<BTGHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadDashboard = async () => {
    try {
      // Testar conexão BTG
      const healthRes = await fetch("/api/btg/health");
      const healthData = await healthRes.json();
      setHealth(healthData);

      // Carregar estatísticas (mock por enquanto)
      // TODO: Criar endpoint de estatísticas
      setStats({
        boletosAtivos: 0,
        boletosPagos: 0,
        pixAtivos: 0,
        pixPagos: 0,
        valorTotal: 0,
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard BTG:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dashboard BTG",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

    loadDashboard();
  }, [toast]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="p-8 space-y-6">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                🏦 BTG Pactual Banking
              </h1>
              <p className="text-slate-400">
                Dashboard de integração bancária
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Status da Conexão */}
        <FadeIn delay={0.15}>
          <GlassmorphismCard className={`border ${
            health?.success 
              ? "border-green-500/30 bg-gradient-to-br from-green-900/10 to-green-800/5" 
              : "border-red-500/30 bg-gradient-to-br from-red-900/10 to-red-800/5"
          }`}>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className={`font-semibold ${
                  health?.success ? "text-green-300" : "text-red-300"
                }`}>
                  {health?.success ? "✅ BTG API está acessível e autenticação funcionando" : "❌ Erro na conexão com BTG"}
                </p>
                <p className={`text-sm ${
                  health?.success ? "text-green-400/70" : "text-red-400/70"
                }`}>
                  Ambiente: {health?.environment || "N/A"} | {health?.apiUrl || "N/A"}
                </p>
              </div>
              <div>
                {health?.success ? (
                  <CheckCircle className="w-10 h-10 text-green-400" />
                ) : (
                  <Clock className="w-10 h-10 text-red-400" />
                )}
              </div>
            </div>
          </GlassmorphismCard>
        </FadeIn>

        {/* KPI Cards Premium */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Boletos Ativos */}
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-blue-500/30 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl shadow-inner">
                      <DollarSign className="h-6 w-6 text-blue-400" />
                    </div>
                    <span className="text-xs text-blue-300 font-semibold px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                      Ativos
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Boletos Ativos</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.boletosAtivos} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Boletos Pagos */}
            <FadeIn delay={0.3}>
              <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                      ✅ Pagos
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Boletos Pagos</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.boletosPagos} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Pix Ativos */}
            <FadeIn delay={0.4}>
              <GlassmorphismCard className="border-purple-500/30 hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/20">
                <div className="p-6 bg-gradient-to-br from-purple-900/10 to-purple-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl shadow-inner">
                      <QrCode className="h-6 w-6 text-purple-400" />
                    </div>
                    <span className="text-xs text-purple-300 font-semibold px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-400/30">
                      Pix
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Pix Ativos</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.pixAtivos} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Total Recebido */}
            <FadeIn delay={0.5}>
              <GlassmorphismCard className="border-amber-500/30 hover:border-amber-400/50 transition-all hover:shadow-lg hover:shadow-amber-500/20">
                <div className="p-6 bg-gradient-to-br from-amber-900/10 to-amber-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl shadow-inner">
                      <TrendingUp className="h-6 w-6 text-amber-400" />
                    </div>
                    <span className="text-xs text-amber-300 font-semibold px-3 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full border border-amber-400/30">
                      Total
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total Recebido</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                    R$ <NumberCounter value={stats.valorTotal} decimals={2} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

      {/* Guia Rápido */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          🏦 Guia Rápido - BTG Pactual
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h3 className="font-semibold mb-2">Boletos:</h3>
            <ul className="space-y-1">
              <li>• Gerar ao finalizar faturamento</li>
              <li>• PDF disponível automaticamente</li>
              <li>• Webhook atualiza status quando pago</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Pix Cobrança:</h3>
            <ul className="space-y-1">
              <li>• QR Code dinâmico gerado</li>
              <li>• Expira em 24h (configurável)</li>
              <li>• Pagamento instantâneo</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <FadeIn delay={0.6}>
        <div className="grid grid-cols-2 gap-6">
          <GlassmorphismCard className="border-blue-500/20">
            <div className="p-6">
              <h3 className="font-semibold mb-4 text-blue-300">📄 Boletos</h3>
              <RippleButton className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500">
                Ver Todos os Boletos
              </RippleButton>
            </div>
          </GlassmorphismCard>

          <GlassmorphismCard className="border-purple-500/20">
            <div className="p-6">
              <h3 className="font-semibold mb-4 text-purple-300">💳 Pix Cobranças</h3>
              <RippleButton className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                Ver Todas as Cobranças
              </RippleButton>
            </div>
          </GlassmorphismCard>
        </div>
      </FadeIn>

      {/* Links de Documentação */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold mb-3">📚 Documentação BTG</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <a
            href="https://developers.empresas.btgpactual.com/docs/comecando"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            → Documentação Geral
          </a>
          <a
            href="https://developers.empresas.btgpactual.com/reference"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            → API Reference
          </a>
          <a
            href="https://developers.empresas.btgpactual.com/docs/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            → Webhooks
          </a>
          <a
            href="https://developers.empresas.btgpactual.com/comunidade"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            → Comunidade
          </a>
        </div>
      </div>
      </div>
    </PageTransition>
  );
}

