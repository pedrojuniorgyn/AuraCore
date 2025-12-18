"use client";

import { useEffect, useMemo, useState } from "react";
import { useTenant } from "@/contexts/tenant-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SnapshotItem = {
  runId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  errorMessage: string | null;
};

export default function AuditSnapshotsPage() {
  const { user, isLoading } = useTenant();
  const isAdmin = user?.role === "ADMIN";

  const [items, setItems] = useState<SnapshotItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"run" | "migrate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/audit/snapshots", { headers: { "x-audit-debug": "1" } });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha ao listar snapshots");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const run = async () => {
    setBusy("run");
    setError(null);
    try {
      const res = await fetch("/api/admin/audit/snapshots/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-audit-debug": "1" },
        body: JSON.stringify({ axis: "VENCIMENTO" }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha ao executar snapshot");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const migrate = async () => {
    setBusy("migrate");
    setError(null);
    try {
      const res = await fetch("/api/admin/audit/snapshots/migrate", {
        method: "POST",
        headers: { "x-audit-debug": "1" },
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha ao migrar AuditFinDB");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (isAdmin) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const statusVariant = useMemo(() => {
    return (status: string): "default" | "secondary" | "destructive" => {
      if (status === "SUCCEEDED") return "default";
      if (status === "RUNNING") return "secondary";
      if (status === "FAILED") return "destructive";
      return "secondary";
    };
  }, []);

  if (isLoading) return null;
  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Auditoria</h1>
        <p className="text-muted-foreground mt-2">Sem permissão (apenas ADMIN).</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Auditoria — Snapshots</h1>
          <p className="text-muted-foreground">Execução e acompanhamento do ETL no AuditFinDB</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading || busy !== null}>
            Atualizar
          </Button>
          <Button variant="outline" onClick={migrate} disabled={loading || busy !== null}>
            {busy === "migrate" ? "Migrando..." : "Migrar schema"}
          </Button>
          <Button onClick={run} disabled={loading || busy !== null}>
            {busy === "run" ? "Executando..." : "Rodar snapshot"}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="p-4 border-red-500/30">
          <div className="text-sm text-red-600">{error}</div>
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="space-y-3">
          {items.length ? (
            items.map((it) => (
              <div key={it.runId} className="flex flex-col gap-1 border-b last:border-b-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-mono text-sm">{it.runId}</div>
                  <Badge variant={statusVariant(it.status)}>{it.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                  <span>Período: {it.periodStart ?? "—"} → {it.periodEnd ?? "—"}</span>
                  <span>Início: {it.startedAt ?? "—"}</span>
                  <span>Fim: {it.finishedAt ?? "—"}</span>
                </div>
                {it.errorMessage ? (
                  <div className="text-xs text-red-600 break-words">{it.errorMessage}</div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">Sem execuções ainda.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

