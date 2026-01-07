"use client";

import { useState, useEffect } from "react";
import { Upload, Check, X, AlertCircle, FileText, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";

interface BankTransaction {
  id: number;
  transactionDate: string;
  description: string;
  amount: number;
  reconciled: string;
}

export default function BankReconciliationPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const bankAccountId = 1; // TODO: trocar por seleção de conta

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/bank-transactions?bankAccountId=${bankAccountId}&limit=200`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error ?? "Falha ao listar transações");
      }
      setTransactions(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bankAccountId", String(bankAccountId)); // TODO: trocar por seleção de conta

      const res = await fetch("/api/financial/bank-transactions/import-ofx", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data?.success) throw new Error(data?.error ?? "Falha ao importar OFX");

      // Novo fluxo (Onda 6): importação pode ser enfileirada (jobs)
      if (data.queued && data.jobId) {
        const jobId = Number(data.jobId);
        toast({
          title: "Importação enfileirada",
          description: "Acompanhe em Configurações → Document Pipeline. Tentando atualizar automaticamente...",
        });

        // Poll simples (best-effort) para dar feedback e atualizar lista
        const startedAt = Date.now();
        while (Date.now() - startedAt < 60_000) {
          await new Promise((r) => setTimeout(r, 2000));
          const jobRes = await fetch(`/api/documents/jobs/${jobId}`, { cache: "no-store" });
          const jobJson = await jobRes.json().catch(() => null);
          const status = jobJson?.job?.status as string | undefined;
          if (status === "SUCCEEDED") {
            const result = jobJson?.job?.resultJson ? JSON.parse(jobJson.job.resultJson) : null;
            toast({
              title: "Importação concluída",
              description: `${result?.inserted ?? 0} transações importadas`,
            });
            await loadTransactions();
            break;
          }
          if (status === "FAILED") {
            toast({
              title: "Importação falhou",
              description: jobJson?.job?.lastError ?? "Falha ao importar OFX",
              variant: "destructive",
            });
            break;
          }
        }
      } else {
        toast({
          title: "Sucesso",
          description: `${data.count} transações importadas`,
        });
        await loadTransactions();
      }
    } catch (error) {
      console.error("Erro ao importar OFX:", error);
      toast({
        title: "Erro",
        description: "Falha ao importar arquivo OFX",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const reconcile = async (txId: number) => {
    try {
      const res = await fetch(`/api/financial/bank-transactions/${txId}/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reconciled: "S" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error ?? "Falha ao conciliar");
      await loadTransactions();
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Falha ao conciliar transação", variant: "destructive" });
    }
  };

  const stats = {
    total: transactions.length,
    reconciled: transactions.filter((t) => t.reconciled === "S").length,
    pending: transactions.filter((t) => t.reconciled === "N").length,
  };

  return (
    <PageTransition>
      <div className="p-8 space-y-6">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                💼 Conciliação Bancária
              </h1>
              <p className="text-slate-400 mt-1">
                Importar extrato OFX e conciliar com lançamentos
              </p>
            </div>
            <div>
              <input
                type="file"
                accept=".ofx"
                onChange={handleFileUpload}
                className="hidden"
                id="ofx-upload"
                disabled={uploading}
              />
              <label htmlFor="ofx-upload">
                <RippleButton asChild disabled={uploading} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500">
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Importando..." : "Importar OFX"}
                  </span>
                </RippleButton>
              </label>
            </div>
          </div>
        </FadeIn>

        {/* KPI Cards Premium */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Transações */}
            <FadeIn delay={0.15}>
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
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total de Transações</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.total} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Conciliadas */}
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                      ✅ OK
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Conciliadas</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.reconciled} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Pendentes */}
            <FadeIn delay={0.25}>
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
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Pendentes</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.pending} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">
          Como funciona a conciliação?
        </h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Faça o download do extrato OFX do seu banco</li>
          <li>Clique em &quot;Importar OFX&quot; e selecione o arquivo</li>
          <li>
            As transações serão importadas e você poderá conciliá-las
            manualmente
          </li>
          <li>
            Em breve: conciliação automática por valor e data! 🎯
          </li>
        </ol>
      </div>

      {/* Lista de Transações */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Transações Importadas</h2>
            <Button variant="secondary" onClick={loadTransactions} disabled={loading}>
              Atualizar
            </Button>
          </div>
        </div>

        <div className="p-6">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Nenhuma transação importada ainda
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Importe um arquivo OFX para começar
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.transactionDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        tx.amount >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      R$ {Math.abs(tx.amount).toFixed(2)}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      {tx.reconciled === "S" ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <>
                          <X className="w-5 h-5 text-gray-400" />
                          <Button size="sm" onClick={() => reconcile(tx.id)}>
                            Conciliar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </PageTransition>
  );
}

