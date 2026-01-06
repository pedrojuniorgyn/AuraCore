"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GridPattern } from "@/components/ui/animated-background";
import { Activity, RefreshCw, Play, History as HistoryIcon } from "lucide-react";
import { toast } from "sonner";

type OpsRun = {
  id: number;
  runId: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  summaryJson: string | null;
  detailsJson: string | null;
  errorMessage: string | null;
};

function statusBadgeVariant(status: OpsRun["status"]) {
  if (status === "SUCCEEDED") return "success" as const;
  if (status === "FAILED") return "destructive" as const;
  return "warning" as const;
}

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export default function OperacoesPage() {
  const [latest, setLatest] = useState<OpsRun | null>(null);
  const [history, setHistory] = useState<OpsRun[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [latestRes, histRes] = await Promise.all([
        fetch("/api/admin/ops/health/latest", { cache: "no-store" }),
        fetch("/api/admin/ops/health/history?limit=25", { cache: "no-store" }),
      ]);

      if (!latestRes.ok) {
        const latestErr = await latestRes.json().catch(() => null as any);
        throw new Error(
          latestErr?.message ??
            latestErr?.error ??
            `Falha ao carregar último resultado (${latestRes.status})`
        );
      }
      if (!histRes.ok) {
        const histErr = await histRes.json().catch(() => null as any);
        throw new Error(
          histErr?.message ?? histErr?.error ?? `Falha ao carregar histórico (${histRes.status})`
        );
      }

      const latestJson = await latestRes.json();
      const histJson = await histRes.json();

      setLatest((latestJson?.run as OpsRun) ?? null);
      setHistory((histJson?.runs as OpsRun[]) ?? []);
    } catch (e: unknown) {
      toast.error(e?.message ?? "Falha ao carregar Operações");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRunNow = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/ops/health/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "ui" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Falha ao executar smoke test");
      toast.success("Smoke test iniciado/registrado");
      await load();
    } catch (e: unknown) {
      toast.error(e?.message ?? "Falha ao executar smoke test");
    } finally {
      setLoading(false);
    }
  }, [load]);

  const latestSummary = useMemo(() => safeJsonParse<any>(latest?.summaryJson ?? null), [latest]);

  return (
    <PageTransition>
      <div className="flex-1 space-y-6 p-8 pt-6 relative">
        <GridPattern className="opacity-30" />

        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                <span className="inline-flex items-center gap-2">
                  <Activity className="h-7 w-7 text-cyan-400" />
                  Operações (Smoke Tests)
                </span>
              </h1>
              <p className="text-slate-400 mt-1">
                Relatório automático pós-deploy + reexecução sob demanda.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={onRunNow} disabled={loading}>
                <Play className="h-4 w-4 mr-2" />
                Rodar agora
              </Button>
            </div>
          </div>
        </FadeIn>

        <div className="grid gap-6">
          <FadeIn delay={0.2}>
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Último resultado</span>
                  {latest ? (
                    <Badge variant={statusBadgeVariant(latest.status)}>{latest.status}</Badge>
                  ) : (
                    <Badge variant="outline">sem execuções</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {latest
                    ? `Início: ${latest.startedAt}${latest.durationMs ? ` • ${latest.durationMs}ms` : ""}`
                    : "O primeiro smoke test será gerado automaticamente após deploy (via /api/health)."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {latest ? (
                  <>
                    {latest.errorMessage ? (
                      <div className="text-sm text-red-400">{latest.errorMessage}</div>
                    ) : null}

                    {latestSummary?.checks ? (
                      <div className="grid gap-2">
                        {(latestSummary.checks as any[]).map((c, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{c.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={c.ok ? "success" : "destructive"}>{c.ok ? "OK" : "FAIL"}</Badge>
                              <span className="text-xs text-muted-foreground">{c.durationMs}ms</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Sem resumo disponível.</div>
                    )}

                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground">
                        Ver detalhes (JSON)
                      </summary>
                      <pre className="mt-2 text-xs whitespace-pre-wrap break-words bg-black/30 border border-white/10 rounded-lg p-3">
                        {latest.detailsJson ?? latest.summaryJson ?? ""}
                      </pre>
                    </details>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Aguarde alguns segundos após o deploy e clique em “Atualizar”.
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.3}>
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HistoryIcon className="h-5 w-5" />
                  Histórico (últimas 25 execuções)
                </CardTitle>
                <CardDescription>Útil para correlacionar deploys e regressões.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.length ? (
                  <div className="space-y-2">
                    {history.map((r) => (
                      <div key={r.runId} className="flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.runId}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.startedAt}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusBadgeVariant(r.status)}>{r.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {r.durationMs ? `${r.durationMs}ms` : "-"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Sem histórico ainda.</div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}

