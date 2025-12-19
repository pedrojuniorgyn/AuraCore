"use client";

import { useEffect, useMemo, useState } from "react";
import { useTenant } from "@/contexts/tenant-context";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type Finding = {
  id: string;
  runId: string;
  ruleCode: string;
  severity: "INFO" | "WARN" | "ERROR" | string;
  entityType: string;
  entityId: string | null;
  message: string;
  startedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  branchId: number | null;
};

async function readJsonOrThrow(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return await res.json();
  const text = await res.text().catch(() => "");
  const snippet = text ? ` — ${text.slice(0, 200)}` : "";
  throw new Error(`HTTP ${res.status} ${res.statusText} (resposta não-JSON)${snippet}`);
}

export default function AuditFindingsPage() {
  const { user, isLoading } = useTenant();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const canRead = user?.role === "ADMIN" || hasPermission("audit.read");

  const [items, setItems] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sinceDays, setSinceDays] = useState<0 | 7 | 30>(7);
  const [severity, setSeverity] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const [runId, setRunId] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (sinceDays) qs.set("sinceDays", String(sinceDays));
      if (severity !== "ALL") qs.set("severity", severity);
      if (runId.trim()) qs.set("runId", runId.trim());
      qs.set("limit", "200");

      const res = await fetch(`/api/admin/audit/findings?${qs.toString()}`, {
        headers: { "x-audit-debug": "1" },
        credentials: "include",
      });
      const data = await readJsonOrThrow(res);
      if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha ao listar achados");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead, sinceDays, severity]);

  const badgeVariant = useMemo(() => {
    return (s: string): "default" | "secondary" | "destructive" => {
      if (s === "ERROR") return "destructive";
      if (s === "WARN") return "secondary";
      return "default";
    };
  }, []);

  if (isLoading || permissionsLoading) return null;
  if (!canRead) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Auditoria</h1>
        <p className="text-muted-foreground mt-2">
          Sem permissão. Necessário: <code>audit.read</code>
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Auditoria — Achados</h1>
          <p className="text-muted-foreground">Alertas e inconsistências geradas pelo ETL</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>
            Atualizar
          </Button>
          <Button
            variant={sinceDays === 7 ? "default" : "outline"}
            onClick={() => setSinceDays(7)}
            disabled={loading}
          >
            7d
          </Button>
          <Button
            variant={sinceDays === 30 ? "default" : "outline"}
            onClick={() => setSinceDays(30)}
            disabled={loading}
          >
            30d
          </Button>
          <Button
            variant={sinceDays === 0 ? "default" : "outline"}
            onClick={() => setSinceDays(0)}
            disabled={loading}
          >
            Tudo
          </Button>

          <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              <SelectItem value="INFO">INFO</SelectItem>
              <SelectItem value="WARN">WARN</SelectItem>
              <SelectItem value="ERROR">ERROR</SelectItem>
            </SelectContent>
          </Select>

          <Input
            value={runId}
            onChange={(e) => setRunId(e.target.value)}
            placeholder="Filtrar por runId (UUID)"
            className="w-[280px]"
          />
          <Button variant="outline" onClick={load} disabled={loading}>
            Filtrar
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
              <div key={it.id} className="flex flex-col gap-1 border-b last:border-b-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-mono text-xs text-muted-foreground">{it.runId}</div>
                  <Badge variant={badgeVariant(it.severity)}>{it.severity}</Badge>
                </div>
                <div className="text-sm font-medium">{it.ruleCode}</div>
                <div className="text-sm">{it.message}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    Período: {it.periodStart ?? "—"} → {it.periodEnd ?? "—"}
                  </span>
                  <span>Início: {it.startedAt ?? "—"}</span>
                  <span>Branch: {it.branchId ?? "—"}</span>
                  <span>
                    Entidade: {it.entityType} {it.entityId ? `#${it.entityId}` : ""}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">Sem achados no período.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

