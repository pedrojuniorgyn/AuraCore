"use client";

import { useEffect, useMemo, useState } from "react";
import { useTenant } from "@/contexts/tenant-context";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type Parcela = {
  runId: string;
  parcelaId: number | null;
  movimentoId: number | null;
  compraId: number | null;
  pessoaId: number | null;
  codigoEmpresaFilial: number | null;
  numeroDocumento: number | null;
  operacao: string | null;
  dataDocumento: string | null;
  dataVencimento: string | null;
  valorParcela: number | null;
  valorPago: number | null;
  contaBancariaId: number | null;
  contaBancariaIdInferida: number | null;
  contaBancariaInferidaRegra: string | null;
  isContaBancariaInferida: boolean | null;
  contaBancariaIdEfetiva: number | null;
  hasVinculoBancario: boolean | null;
  boolConciliado: boolean | null;
  status: string | null;
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

export default function AuditParcelasPage() {
  const { user, isLoading } = useTenant();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const canRead = user?.role === "ADMIN" || hasPermission("audit.read");

  const [items, setItems] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sinceDays, setSinceDays] = useState<0 | 7 | 30>(7);
  const [runId, setRunId] = useState("");
  const [operacao, setOperacao] = useState<"ALL" | "PAGAMENTO" | "RECEBIMENTO">("ALL");
  const [status, setStatus] = useState("ALL");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyNoBankLink, setOnlyNoBankLink] = useState(false);
  const [onlyPendingConciliation, setOnlyPendingConciliation] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (sinceDays) qs.set("sinceDays", String(sinceDays));
      if (runId.trim()) qs.set("runId", runId.trim());
      if (operacao !== "ALL") qs.set("operacao", operacao);
      if (status !== "ALL") qs.set("status", status);
      if (onlyOpen) qs.set("onlyOpen", "true");
      if (onlyOverdue) qs.set("onlyOverdue", "true");
      if (onlyNoBankLink) qs.set("onlyNoBankLink", "true");
      if (onlyPendingConciliation) qs.set("onlyPendingConciliation", "true");
      qs.set("limit", "500");

      const res = await fetch(`/api/admin/audit/parcelas?${qs.toString()}`, {
        headers: { "x-audit-debug": "1" },
        credentials: "include",
      });
      const data = await readJsonOrThrow(res);
      if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha ao listar parcelas");
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

  const statusVariant = useMemo(() => {
    return (s: string | null): "default" | "secondary" | "destructive" => {
      if (!s) return "secondary";
      if (s === "VENCIDA" || s === "SEM_VINCULO_BANCARIO") return "destructive";
      if (s === "PENDENTE_CONCILIACAO" || s === "PAGA_SEM_DATA_REAL") return "secondary";
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
          <h1 className="text-3xl font-bold">Auditoria — Parcelas</h1>
          <p className="text-muted-foreground">Base: <code>audit_fact_parcelas</code></p>
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
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            value={runId}
            onChange={(e) => setRunId(e.target.value)}
            placeholder="runId (UUID)"
            className="w-[280px]"
          />

          <Select value={operacao} onValueChange={(v) => setOperacao(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Operação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              <SelectItem value="PAGAMENTO">PAGAMENTO</SelectItem>
              <SelectItem value="RECEBIMENTO">RECEBIMENTO</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => setStatus(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="ABERTA">ABERTA</SelectItem>
              <SelectItem value="VENCIDA">VENCIDA</SelectItem>
              <SelectItem value="CONCILIADA">CONCILIADA</SelectItem>
              <SelectItem value="PENDENTE_CONCILIACAO">PENDENTE_CONCILIACAO</SelectItem>
              <SelectItem value="SEM_VINCULO_BANCARIO">SEM_VINCULO_BANCARIO</SelectItem>
              <SelectItem value="PAGA_SEM_DATA_REAL">PAGA_SEM_DATA_REAL</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Checkbox checked={onlyOpen} onCheckedChange={(v) => setOnlyOpen(Boolean(v))} />
            <span className="text-sm">Abertas</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={onlyOverdue} onCheckedChange={(v) => setOnlyOverdue(Boolean(v))} />
            <span className="text-sm">Vencidas</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={onlyNoBankLink} onCheckedChange={(v) => setOnlyNoBankLink(Boolean(v))} />
            <span className="text-sm">Sem vínculo bancário</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={onlyPendingConciliation}
              onCheckedChange={(v) => setOnlyPendingConciliation(Boolean(v))}
            />
            <span className="text-sm">Pendente conciliação</span>
          </div>

          <Button variant="outline" onClick={load} disabled={loading}>
            Filtrar
          </Button>
        </div>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
      </Card>

      <Card className="p-4">
        <div className="space-y-3">
          {items.length ? (
            items.map((it) => (
              <div
                key={`${it.runId}-${it.parcelaId ?? "x"}-${it.movimentoId ?? "y"}`}
                className="flex flex-col gap-1 border-b last:border-b-0 pb-3 last:pb-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-medium">
                    {it.operacao ?? "—"} • Doc {it.numeroDocumento ?? "—"} • Parcela {it.parcelaId ?? "—"}
                  </div>
                  <Badge variant={statusVariant(it.status)}>{it.status ?? "—"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                  <span>Venc: {it.dataVencimento ?? "—"}</span>
                  <span>Valor: {formatMoney(it.valorParcela)}</span>
                  <span>Pago: {formatMoney(it.valorPago)}</span>
                  <span>Filial legada: {it.codigoEmpresaFilial ?? "—"}</span>
                  <span>Branch: {it.branchId ?? "—"}</span>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                  <span>Vínculo bancário: {it.hasVinculoBancario == null ? "—" : it.hasVinculoBancario ? "sim" : "não"}</span>
                  <span>Conciliado: {it.boolConciliado == null ? "—" : it.boolConciliado ? "sim" : "não"}</span>
                  <span>Conta real: {it.contaBancariaId ?? "—"}</span>
                  <span>
                    Conta inferida: {it.contaBancariaIdInferida ?? "—"} {it.contaBancariaInferidaRegra ? `(${it.contaBancariaInferidaRegra})` : ""}
                  </span>
                  <span>Conta efetiva: {it.contaBancariaIdEfetiva ?? "—"}</span>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">{it.runId}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">Sem parcelas no período.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

