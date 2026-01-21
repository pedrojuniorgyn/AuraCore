"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import {
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";

interface DDADebit {
  id: number;
  btg_debit_id: string;
  creditor_name: string;
  creditor_document: string;
  amount: number;
  due_date: string;
  digitable_line: string;
  barcode: string;
  description: string;
  status: string;
}

export default function DDAPage() {
  const [debits, setDebits] = useState<DDADebit[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    total: 0,
    totalAmount: 0,
  });
  const { toast } = useToast();

  const loadDebits = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/btg/dda/debits");
      const data = await response.json();

      if (data.success) {
        setDebits(data.debits);
        
        const pending = data.debits.filter((d: DDADebit) => d.status === "PENDING").length;
        const total = data.debits.length;
        const totalAmount = data.debits
          .filter((d: DDADebit) => d.status === "PENDING")
          .reduce((sum: number, d: DDADebit) => sum + d.amount, 0);

        setStats({ pending, total, totalAmount });
      }
    } catch (error) {
      console.error("Erro ao carregar débitos DDA:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar débitos DDA",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDebits();
  }, [loadDebits]);

  const syncDDA = async () => {
    try {
      setSyncing(true);
      toast({
        title: "Sincronizando...",
        description: "Buscando débitos do BTG",
      });

      const response = await fetch("/api/btg/dda/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Sincronizado com sucesso!",
          description: `${data.stats.debits} débitos importados`,
        });
        await loadDebits();
      } else {
        toast({
          title: "❌ Erro",
          description: data.error || "Falha ao sincronizar",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao sincronizar DDA:", error);
      toast({
        title: "❌ Erro",
        description: "Falha ao sincronizar DDA",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: LucideIcon; text: string }> = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Clock, text: "Pendente" },
      PAID: { color: "bg-green-100 text-green-800", icon: CheckCircle, text: "Pago" },
      REJECTED: { color: "bg-red-100 text-red-800", icon: XCircle, text: "Rejeitado" },
    };

    const badge = badges[status] || badges.PENDING;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                📋 DDA - Débito Direto Autorizado
              </h1>
              <p className="text-slate-400 mt-1">
                Consulte e pague boletos via BTG Pactual
              </p>
            </div>
            <RippleButton onClick={syncDDA} disabled={syncing} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando..." : "Sincronizar BTG"}
            </RippleButton>
          </div>
        </FadeIn>

        {/* KPI Cards Premium */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Débitos Pendentes */}
            <FadeIn delay={0.15}>
              <GlassmorphismCard className="border-amber-500/30 hover:border-amber-400/50 transition-all hover:shadow-lg hover:shadow-amber-500/20">
                <div className="p-6 bg-gradient-to-br from-amber-900/10 to-amber-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl shadow-inner">
                      <Clock className="h-6 w-6 text-amber-400" />
                    </div>
                    <span className="text-xs text-amber-300 font-semibold px-3 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full border border-amber-400/30">
                      ⏰ Pendente
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Débitos Pendentes</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.pending} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Total Débitos */}
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-blue-500/30 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl shadow-inner">
                      <FileText className="h-6 w-6 text-blue-400" />
                    </div>
                    <span className="text-xs text-blue-300 font-semibold px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                      Total
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total de Débitos</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.total} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Valor Total */}
            <FadeIn delay={0.25}>
              <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                      <DollarSign className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                      R$
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Valor Total Pendente</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    {formatCurrency(stats.totalAmount)}
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

      {/* Lista de Débitos */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Débitos Recentes</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {debits.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="font-semibold">Nenhum débito encontrado</p>
              <p className="text-sm mt-1">
                Clique em &quot;Sincronizar BTG&quot; para importar débitos
              </p>
            </div>
          ) : (
            debits.map((debit) => (
              <div
                key={debit.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {debit.creditor_name}
                      </h3>
                      {getStatusBadge(debit.status)}
                      {isOverdue(debit.due_date) && debit.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3" />
                          Vencido
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-semibold">CNPJ/CPF:</p>
                        <p>{debit.creditor_document}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Vencimento:</p>
                        <p className={isOverdue(debit.due_date) && debit.status === "PENDING" ? "text-red-600 font-semibold" : ""}>
                          {formatDate(debit.due_date)}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Valor:</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(debit.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Linha Digitável:</p>
                        <p className="font-mono text-xs">
                          {debit.digitable_line || "N/A"}
                        </p>
                      </div>
                    </div>

                    {debit.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Descrição:</strong> {debit.description}
                      </p>
                    )}
                  </div>

                  <div className="ml-4 flex gap-2">
                    {debit.status === "PENDING" && (
                      <>
                        <Button size="sm" variant="outline">
                          Ver Detalhes
                        </Button>
                        <Button size="sm">Pagar</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Guia Rápido */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">
          💡 Como usar o DDA:
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>
            <strong>1. Sincronize:</strong> Clique em &quot;Sincronizar BTG&quot; para
            buscar débitos autorizados
          </li>
          <li>
            <strong>2. Analise:</strong> Revise os débitos pendentes e vencimentos
          </li>
          <li>
            <strong>3. Pague:</strong> Clique em &quot;Pagar&quot; para efetuar o pagamento
            via BTG
          </li>
          <li>
            <strong>4. Automatize:</strong> Configure pagamento automático nos
            DDAs desejados
          </li>
        </ul>
      </div>
      </div>
    </PageTransition>
  );
}

