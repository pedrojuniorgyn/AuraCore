"use client";

import { useEffect, useMemo, useState } from "react";
import { useTenant } from "@/contexts/tenant-context";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CashflowRow = {
  runId: string;
  date: string | null;
  contaBancariaId: number | null;
  codigoEmpresaFilial: number | null;
  entradas: number | null;
  saidas: number | null;
  liquido: number | null;
  saldoInicial: number | null;
  saldoFinal: number | null;
  statusCaixa: string | null;
  startedAt: string | null;
  branchId: number | null;
};

async function readJsonOrThrow(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return await res.json();
  const text = await res.text().catch(() => "");
  const snippet = text ? ` — ${text.slice(0, 200)}` : "";
  throw new Error(`HTTP ${res.status} ${res.statusText} (resposta não-JSON)${snippet}`);
}

function formatMoney(v: number | null) {
  if (v == null || Number.isNaN(v)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  } catch {
    return String(v);
  }
}

export default function AuditCashflowPage() {
  const { user, isLoading } = useTenant();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const canRead = user?.role === "ADMIN" || hasPermission("audit.read");

  const [items, setItems] = useState<CashflowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sinceDays, setSinceDays] = useState<0 | 7 | 30>(7);
  const [runId, setRunId] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (sinceDays) qs.set("sinceDays", String(sinceDays));
      if (runId.trim()) qs.set("runId", runId.trim());
      qs.set("limit", "2000");

      const res = await fetch(`/api/admin/audit/cashflow?${qs.toString()}`, {
        headers: { "x-audit-debug": "1" },
        credentials: "include",
      });
      const data = await readJsonOrThrow(res);
      if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha ao carregar fluxo de caixa");
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
  }, [canRead, sinceDays]);

  const grouped = useMemo(() => {
    // Agrupa por (date, conta) para somar entradas/saídas e pegar o último saldo_final do dia.
    const map = new Map<string, CashflowRow>();
    for (const it of items) {
      const key = `${it.date ?? "—"}|${it.contaBancariaId ?? "—"}|${it.codigoEmpresaFilial ?? "—"}`;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { ...it });
      } else {
        map.set(key, {
          ...prev,
          entradas: (prev.entradas ?? 0) + (it.entradas ?? 0),
          saidas: (prev.saidas ?? 0) + (it.saidas ?? 0),
          liquido: (prev.liquido ?? 0) + (it.liquido ?? 0),
          // saldoFinal: mantém o maior (ordem já vem desc; então preferimos o primeiro não-null)
          saldoFinal: prev.saldoFinal ?? it.saldoFinal,
          saldoInicial: prev.saldoInicial ?? it.saldoInicial,
        });
      }
    }
    return Array.from(map.values());
  }, [items]);

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
          <h1 className="text-3xl font-bold">Auditoria — Fluxo de Caixa</h1>
          <p className="text-muted-foreground">Baseado em movimentos bancários e tipos de operação</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>
            Atualizar
          </Button>
          <Button variant={sinceDays === 7 ? "default" : "outline"} onClick={() => setSinceDays(7)} disabled={loading}>
            7d
          </Button>
          <Button variant={sinceDays === 30 ? "default" : "outline"} onClick={() => setSinceDays(30)} disabled={loading}>
            30d
          </Button>
          <Button variant={sinceDays === 0 ? "default" : "outline"} onClick={() => setSinceDays(0)} disabled={loading}>
            Tudo
          </Button>
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
        <div className="space-y-2">
          {grouped.length ? (
            grouped.map((it, idx) => (
              <div key={`${it.runId}-${it.date}-${it.contaBancariaId}-${idx}`} className="border-b last:border-b-0 pb-3 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-medium">
                    {it.date ?? "—"} • Conta {it.contaBancariaId ?? "—"} • Filial legada {it.codigoEmpresaFilial ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{it.runId}</div>
                </div>
                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 mt-1">
                  <span>Entradas: {formatMoney(it.entradas)}</span>
                  <span>Saídas: {formatMoney(it.saidas)}</span>
                  <span>Líquido: {formatMoney(it.liquido)}</span>
                  <span>Saldo Inicial: {formatMoney(it.saldoInicial)}</span>
                  <span>Saldo Final: {formatMoney(it.saldoFinal)}</span>
                  <span>Status: {it.statusCaixa ?? "—"}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">Sem dados no período.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

