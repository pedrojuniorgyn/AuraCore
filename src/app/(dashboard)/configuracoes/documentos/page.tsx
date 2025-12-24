"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GridPattern } from "@/components/ui/animated-background";
import { FileText, RefreshCw, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type Job = {
  id: number;
  documentId: number;
  jobType: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
};

function statusBadgeVariant(status: Job["status"]) {
  if (status === "SUCCEEDED") return "success" as const;
  if (status === "FAILED") return "destructive" as const;
  if (status === "RUNNING") return "warning" as const;
  return "outline" as const;
}

export default function DocumentosPipelinePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents/jobs?limit=50", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error ?? "Falha ao carregar jobs");
      setJobs((json.jobs as Job[]) ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao carregar Document Pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runNow = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents/jobs/run", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error ?? "Falha ao rodar jobs");
      toast.success(`Jobs processados: ${json.result?.processed ?? 0}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao rodar jobs");
    } finally {
      setLoading(false);
    }
  }, [load]);

  const retryJob = useCallback(
    async (jobId: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/documents/jobs/${jobId}/retry`, { method: "POST" });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.error ?? "Falha ao reenfileirar job");
        toast.success(`Job #${jobId} reenfileirado`);
        await load();
      } catch (e: any) {
        toast.error(e?.message ?? "Falha ao reenfileirar job");
      } finally {
        setLoading(false);
      }
    },
    [load]
  );

  return (
    <PageTransition>
      <div className="flex-1 space-y-6 p-8 pt-6 relative">
        <GridPattern className="opacity-30" />

        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-7 w-7 text-cyan-400" />
                  Document Pipeline
                </span>
              </h1>
              <p className="text-slate-400 mt-1">
                Upload + storage externo + processamento assíncrono (jobs) + reprocesso.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={runNow} disabled={loading}>
                <Play className="h-4 w-4 mr-2" />
                Rodar jobs agora
              </Button>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Card className="backdrop-blur-sm bg-card/80 border-border/50">
            <CardHeader>
              <CardTitle>Últimos jobs (50)</CardTitle>
              <CardDescription>
                Em produção, normalmente o cron roda automaticamente (ENABLE_CRON=true). Aqui você pode inspecionar e forçar execução.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {jobs.length ? (
                <div className="space-y-2">
                  {jobs.map((j) => (
                    <div key={j.id} className="flex items-center justify-between text-sm border border-white/10 rounded-lg p-3 bg-black/20">
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          #{j.id} • {j.jobType}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          docId={j.documentId} • scheduledAt={j.scheduledAt}
                        </div>
                        {j.lastError ? (
                          <div className="text-xs text-red-400 mt-1 truncate">{j.lastError}</div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {j.status === "FAILED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading || j.attempts >= j.maxAttempts}
                            onClick={() => retryJob(j.id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reenfileirar
                          </Button>
                        ) : null}
                        <Badge variant={statusBadgeVariant(j.status)}>{j.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {j.attempts}/{j.maxAttempts}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Sem jobs ainda.</div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}

