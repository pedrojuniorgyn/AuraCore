"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import type { ColDef, ICellRendererParams, IDetailCellRendererParams } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Download, RefreshCw, Filter, ArrowDownCircle, ArrowUpCircle, AlertCircle, Clock, Link2Off } from "lucide-react";

// AG Grid CSS + Aurora theme
import "ag-grid-community/styles/ag-theme-quartz.css";
import "@/styles/aurora-premium-grid.css";
import { PremiumCurrencyCell, PremiumDateCell } from "@/lib/ag-grid/aurora-premium-cells";
import { BooleanCellRenderer } from "@/components/ag-grid/renderers/aurora-renderers";

ModuleRegistry.registerModules([AllEnterpriseModule]);

export type AuditParcela = {
  runId: string;
  parcelaId: number | null;
  movimentoId: number | null;
  compraId: number | null;
  pessoaId: number | null;
  codigoEmpresaFilial: number | null;
  planoContasContabilId?: number | null;
  planoContasContabilNome?: string | null;
  movimentoDescricao?: string | null;
  contaBancariaDescricao?: string | null;
  contaBancariaNomeBanco?: string | null;
  contaBancariaAgencia?: string | null;
  contaBancariaNumeroConta?: string | null;
  numeroDocumento: number | null;
  operacao: "PAGAMENTO" | "RECEBIMENTO" | string | null;
  dataDocumento?: string | null;
  dataVencimento: string | null;
  dataPagamentoReal?: string | null;
  dataLancamentoBanco?: string | null;
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

function statusToUi(status: string | null) {
  // Status do AuditFinDB: ABERTA, VENCIDA, CONCILIADA, PENDENTE_CONCILIACAO, SEM_VINCULO_BANCARIO, PAGA_SEM_DATA_REAL
  const s = (status ?? "").toUpperCase();
  if (s === "CONCILIADA") return { label: "Conciliada", color: "#6EE7B7", bg: "rgba(16,185,129,0.18)", icon: "ok" as const };
  if (s === "VENCIDA") return { label: "Vencida", color: "#FCA5A5", bg: "rgba(239,68,68,0.18)", icon: "alert" as const };
  if (s === "SEM_VINCULO_BANCARIO") return { label: "Sem vínculo", color: "#FCA5A5", bg: "rgba(239,68,68,0.18)", icon: "linkoff" as const };
  if (s === "PENDENTE_CONCILIACAO") return { label: "Pendente concil.", color: "#FCD34D", bg: "rgba(251,191,36,0.18)", icon: "clock" as const };
  if (s === "PAGA_SEM_DATA_REAL") return { label: "Pago s/ data", color: "#93C5FD", bg: "rgba(59,130,246,0.18)", icon: "clock" as const };
  if (s === "ABERTA") return { label: "Aberta", color: "#FCD34D", bg: "rgba(251,191,36,0.18)", icon: "clock" as const };
  return { label: status ?? "—", color: "#A78BFA", bg: "rgba(139,92,246,0.12)", icon: "clock" as const };
}

function AuditStatusCell(props: ICellRendererParams) {
  const ui = statusToUi(props.value ?? null);
  const icon =
    ui.icon === "ok" ? (
      <ArrowUpCircle className="h-3.5 w-3.5" style={{ color: ui.color }} />
    ) : ui.icon === "alert" ? (
      <AlertCircle className="h-3.5 w-3.5" style={{ color: ui.color }} />
    ) : ui.icon === "linkoff" ? (
      <Link2Off className="h-3.5 w-3.5" style={{ color: ui.color }} />
    ) : (
      <Clock className="h-3.5 w-3.5" style={{ color: ui.color }} />
    );

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        borderRadius: "12px",
        background: ui.bg,
        border: `1px solid ${ui.color}40`,
        color: ui.color,
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.4px",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {ui.label}
    </div>
  );
}

function DetailCellRenderer(props: IDetailCellRendererParams) {
  const row = props.data as AuditParcela;
  const bankParts = [
    row.contaBancariaDescricao,
    row.contaBancariaNomeBanco,
    [row.contaBancariaAgencia, row.contaBancariaNumeroConta].filter(Boolean).join("/"),
  ].filter((x) => x && String(x).trim());

  return (
    <div className="p-4 bg-gradient-to-br from-gray-900/50 to-purple-900/10">
      <h4 className="text-sm font-semibold text-purple-300 mb-3">
        🔎 Detalhes da Parcela — Doc #{row.numeroDocumento ?? "-"} • Parcela {row.parcelaId ?? "-"}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-purple-500/20 bg-black/20 p-3">
          <div className="text-xs text-slate-400 mb-1">Plano de Contas</div>
          <div className="font-mono text-xs">{row.planoContasContabilId ?? "-"}</div>
          <div className="text-slate-200">{row.planoContasContabilNome ?? "-"}</div>
        </div>
        <div className="rounded-lg border border-purple-500/20 bg-black/20 p-3">
          <div className="text-xs text-slate-400 mb-1">Conta Bancária (descrição)</div>
          <div className="text-slate-200">{bankParts.length ? bankParts.join(" — ") : "-"}</div>
          <div className="text-xs text-slate-400 mt-2">
            Conta real: {row.contaBancariaId ?? "-"} • Inferida: {row.contaBancariaIdInferida ?? "-"} • Efetiva:{" "}
            {row.contaBancariaIdEfetiva ?? "-"}
          </div>
        </div>
        <div className="rounded-lg border border-purple-500/20 bg-black/20 p-3">
          <div className="text-xs text-slate-400 mb-1">Movimento</div>
          <div className="text-slate-200">{row.movimentoDescricao ?? "-"}</div>
          <div className="text-xs text-slate-400 mt-2 font-mono break-all">{row.runId}</div>
        </div>
      </div>
    </div>
  );
}

async function readJsonOrThrow(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return await res.json();
  const text = await res.text().catch(() => "");
  const snippet = text ? ` — ${text.slice(0, 200)}` : "";
  throw new Error(`HTTP ${res.status} ${res.statusText} (resposta não-JSON)${snippet}`);
}

function sum(values: Array<number | null | undefined>) {
  return values.reduce((acc, v) => acc + (Number(v ?? 0) || 0), 0);
}

export function AuditParcelasGrid(props: {
  operacao: "PAGAMENTO" | "RECEBIMENTO";
  title: string;
  subtitle: string;
}) {
  const gridRef = useRef<AgGridReact>(null);
  const [items, setItems] = useState<AuditParcela[]>([]);
  const [loading, setLoading] = useState(false);

  const [dateField, setDateField] = useState<"VENCIMENTO" | "PAGAMENTO" | "BANCO" | "DOCUMENTO" | "SNAPSHOT">("VENCIMENTO");
  const [preset, setPreset] = useState<"7d" | "30d" | "3m" | "6m" | "12m" | "24m" | "36m" | "custom" | "all">("30d");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [limit, setLimit] = useState<2000 | 5000 | 10000>(5000);
  const [runId, setRunId] = useState("");
  const [status, setStatus] = useState<"ALL" | string>("ALL");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyNoBankLink, setOnlyNoBankLink] = useState(false);
  const [onlyPendingConciliation, setOnlyPendingConciliation] = useState(false);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const applyPreset = useCallback(
    (p: typeof preset) => {
      const today = new Date();
      const end = today.toISOString().slice(0, 10);
      if (p === "all") {
        setStartDate("");
        setEndDate("");
        return;
      }
      if (p === "custom") return;
      if (p === "7d" || p === "30d") {
        const days = p === "7d" ? 7 : 30;
        const start = new Date(today.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        setStartDate(start);
        setEndDate(end);
        return;
      }
      const months =
        p === "3m" ? 3 : p === "6m" ? 6 : p === "12m" ? 12 : p === "24m" ? 24 : p === "36m" ? 36 : 0;
      const startD = new Date(today);
      startD.setMonth(startD.getMonth() - months);
      const start = startD.toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    },
    [setEndDate, setStartDate]
  );

  useEffect(() => {
    applyPreset(preset);
  }, [applyPreset, preset]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("operacao", props.operacao);
      qs.set("limit", String(limit));
      // Novo filtro: por data de negócio (range). Mantemos fallback para sinceDays via preset "7d/30d".
      if (startDate) qs.set("startDate", startDate);
      if (endDate) qs.set("endDate", endDate);
      if (startDate || endDate) qs.set("dateField", dateField);
      if (!startDate && !endDate && preset === "7d") qs.set("sinceDays", "7");
      if (!startDate && !endDate && preset === "30d") qs.set("sinceDays", "30");
      if (runId.trim()) qs.set("runId", runId.trim());
      if (status !== "ALL") qs.set("status", status);
      if (onlyOpen) qs.set("onlyOpen", "true");
      if (onlyOverdue) qs.set("onlyOverdue", "true");
      if (onlyNoBankLink) qs.set("onlyNoBankLink", "true");
      if (onlyPendingConciliation) qs.set("onlyPendingConciliation", "true");

      const res = await fetch(`/api/admin/audit/parcelas?${qs.toString()}`, {
        headers: { "x-audit-debug": "1" },
        credentials: "include",
      });
      const data = await readJsonOrThrow(res);
      if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha ao listar parcelas");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      toast.error("Falha ao carregar parcelas (Auditoria)", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, [
    dateField,
    endDate,
    limit,
    onlyNoBankLink,
    onlyOpen,
    onlyOverdue,
    onlyPendingConciliation,
    props.operacao,
    preset,
    runId,
    startDate,
    status,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo(() => {
    const total = sum(items.map((x) => x.valorParcela));
    const paid = sum(items.map((x) => x.valorPago));
    const overdue = items.filter((x) => String(x.status ?? "").toUpperCase() === "VENCIDA").length;
    const noBank = items.filter((x) => x.hasVinculoBancario === false).length;
    const pendingConc = items.filter((x) => String(x.status ?? "").toUpperCase() === "PENDENTE_CONCILIACAO").length;
    return { total, paid, overdue, noBank, pendingConc, count: items.length };
  }, [items]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        headerName: "Documento",
        children: [
          { field: "numeroDocumento", headerName: "Nº", width: 120, filter: "agNumberColumnFilter" },
          { field: "parcelaId", headerName: "Parcela", width: 120, filter: "agNumberColumnFilter" },
          { field: "movimentoId", headerName: "Movimento", width: 140, filter: "agNumberColumnFilter" },
        ],
      },
      {
        headerName: "Plano de Contas",
        children: [
          { field: "planoContasContabilId", headerName: "ID", width: 130, filter: "agNumberColumnFilter" },
          { field: "planoContasContabilNome", headerName: "Nome", width: 260, filter: "agTextColumnFilter" },
        ],
      },
      {
        headerName: "Descrição",
        children: [
          { field: "movimentoDescricao", headerName: "Movimento", width: 320, filter: "agTextColumnFilter" },
        ],
      },
      {
        headerName: "Datas",
        children: [
          { field: "dataVencimento", headerName: "Vencimento", width: 170, cellRenderer: PremiumDateCell, filter: "agDateColumnFilter" },
          { field: "dataPagamentoReal", headerName: "Pagamento", width: 170, cellRenderer: PremiumDateCell, filter: "agDateColumnFilter" },
          {
            headerName: "Banco",
            width: 320,
            valueGetter: (p) => {
              const d = (p.data as any)?.contaBancariaDescricao as string | null | undefined;
              const banco = (p.data as any)?.contaBancariaNomeBanco as string | null | undefined;
              const ag = (p.data as any)?.contaBancariaAgencia as string | null | undefined;
              const num = (p.data as any)?.contaBancariaNumeroConta as string | null | undefined;
              const parts: string[] = [];
              if (d) parts.push(d);
              if (banco) parts.push(banco);
              const agNum = [ag, num].filter(Boolean).join("/");
              if (agNum) parts.push(agNum);
              return parts.length ? parts.join(" — ") : "-";
            },
            filter: "agTextColumnFilter",
          },
          // mantemos a data do banco disponível via seletor de colunas
          { field: "dataLancamentoBanco", headerName: "Data Banco", width: 170, cellRenderer: PremiumDateCell, filter: "agDateColumnFilter", hide: true },
        ],
      },
      {
        headerName: "Valores",
        children: [
          { field: "valorParcela", headerName: "Valor", width: 170, type: "numericColumn", cellRenderer: PremiumCurrencyCell },
          { field: "valorPago", headerName: "Pago", width: 170, type: "numericColumn", cellRenderer: PremiumCurrencyCell },
        ],
      },
      {
        headerName: "Status",
        children: [
          { field: "status", headerName: "Status", width: 220, cellRenderer: AuditStatusCell, filter: "agSetColumnFilter" },
          { field: "hasVinculoBancario", headerName: "Vínculo banc.", width: 160, cellRenderer: BooleanCellRenderer },
          { field: "boolConciliado", headerName: "Conciliado", width: 140, cellRenderer: BooleanCellRenderer },
        ],
      },
      {
        headerName: "Contas",
        children: [
          { field: "contaBancariaId", headerName: "Conta real", width: 140, filter: "agNumberColumnFilter" },
          { field: "contaBancariaIdInferida", headerName: "Conta inferida", width: 160, filter: "agNumberColumnFilter" },
          { field: "contaBancariaInferidaRegra", headerName: "Regra inferência", width: 200, filter: "agTextColumnFilter" },
          { field: "contaBancariaIdEfetiva", headerName: "Conta efetiva", width: 150, filter: "agNumberColumnFilter" },
        ],
      },
      {
        headerName: "Escopo",
        children: [
          { field: "codigoEmpresaFilial", headerName: "Filial legada", width: 140, filter: "agNumberColumnFilter" },
          { field: "branchId", headerName: "Branch", width: 120, filter: "agNumberColumnFilter" },
          { field: "runId", headerName: "RunId", width: 320, filter: "agTextColumnFilter" },
        ],
      },
    ],
    []
  );

  const exportCsv = () => {
    gridRef.current?.api?.exportDataAsCsv({
      fileName: `${props.operacao === "PAGAMENTO" ? "auditoria-contas-pagar" : "auditoria-contas-receber"}.csv`,
    });
  };

  const iconMain = props.operacao === "PAGAMENTO" ? ArrowDownCircle : ArrowUpCircle;
  const IconMain = iconMain;

  return (
    <PageTransition>
      <div className="p-8 space-y-6">
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                <span className="inline-flex items-center gap-2">
                  <IconMain className="h-8 w-8 text-purple-300" />
                  {props.title}
                </span>
              </h1>
              <p className="text-slate-400 mt-1">{props.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <RippleButton asChild disabled={loading} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500">
                <button onClick={load}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {loading ? "Atualizando..." : "Atualizar"}
                </button>
              </RippleButton>
              <Button variant="outline" onClick={exportCsv} disabled={loading}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </FadeIn>

        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <FadeIn delay={0.15}>
              <GlassmorphismCard className="border-cyan-500/30">
                <div className="p-6 bg-gradient-to-br from-cyan-900/10 to-cyan-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Qtd. parcelas</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.count} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-emerald-500/30">
                <div className="p-6 bg-gradient-to-br from-emerald-900/10 to-emerald-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Valor total</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                    {kpis.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.25}>
              <GlassmorphismCard className="border-blue-500/30">
                <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Pago (soma)</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    {kpis.paid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.3}>
              <GlassmorphismCard className="border-red-500/30">
                <div className="p-6 bg-gradient-to-br from-red-900/10 to-red-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Vencidas</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.overdue} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.35}>
              <GlassmorphismCard className="border-amber-500/30">
                <div className="p-6 bg-gradient-to-br from-amber-900/10 to-amber-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Sem vínculo banc.</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.noBank} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* Toolbar de filtros */}
        <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtros</span>
          </div>

          <Select value={preset} onValueChange={(v) => setPreset(v as any)}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="3m">Últimos 3 meses</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="12m">Últimos 12 meses</SelectItem>
              <SelectItem value="24m">Últimos 24 meses</SelectItem>
              <SelectItem value="36m">Últimos 36 meses</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateField} onValueChange={(v) => setDateField(v as any)}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Filtrar por data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VENCIMENTO">Data de Vencimento</SelectItem>
              <SelectItem value="PAGAMENTO">Data de Pagamento</SelectItem>
              <SelectItem value="BANCO">Data do Banco</SelectItem>
              <SelectItem value="DOCUMENTO">Data do Documento</SelectItem>
              <SelectItem value="SNAPSHOT">Data do Snapshot</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={startDate}
            max={endDate || todayIso}
            onChange={(e) => {
              setPreset("custom");
              setStartDate(e.target.value);
            }}
            className="w-[170px]"
            title="Data inicial"
          />
          <Input
            type="date"
            value={endDate}
            min={startDate || undefined}
            max={todayIso}
            onChange={(e) => {
              setPreset("custom");
              setEndDate(e.target.value);
            }}
            className="w-[170px]"
            title="Data final"
          />

          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v) as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Linhas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2000">2.000 linhas</SelectItem>
              <SelectItem value="5000">5.000 linhas</SelectItem>
              <SelectItem value="10000">10.000 linhas</SelectItem>
            </SelectContent>
          </Select>

          <Input value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="runId (UUID)" className="w-[280px]" />

          <Select value={status} onValueChange={(v) => setStatus(v)}>
            <SelectTrigger className="w-[240px]">
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

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={onlyOpen} onCheckedChange={(v) => setOnlyOpen(Boolean(v))} />
            Abertas
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={onlyOverdue} onCheckedChange={(v) => setOnlyOverdue(Boolean(v))} />
            Vencidas
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={onlyNoBankLink} onCheckedChange={(v) => setOnlyNoBankLink(Boolean(v))} />
            Sem vínculo bancário
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={onlyPendingConciliation} onCheckedChange={(v) => setOnlyPendingConciliation(Boolean(v))} />
            Pendente conciliação
          </label>

          <Button variant="secondary" onClick={load} disabled={loading}>
            Aplicar
          </Button>

          <div className="text-xs text-muted-foreground ml-auto">
            Dica: filtros nas colunas do grid atuam <strong>apenas</strong> sobre as linhas já carregadas. Para buscar 2023/2024,
            ajuste o período/De/Até acima.
          </div>
        </div>

        <div className="aurora-premium-grid">
          <div className="ag-theme-quartz-dark" style={{ height: "70vh", width: "100%" }}>
            <AgGridReact
              ref={gridRef}
              rowData={items}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                resizable: true,
                filter: true,
                floatingFilter: true,
              }}
              masterDetail
              detailCellRenderer={DetailCellRenderer}
              detailRowAutoHeight
              animateRows
              enableRangeSelection
              sideBar={{
                toolPanels: [
                  {
                    id: "columns",
                    labelDefault: "Colunas",
                    labelKey: "columns",
                    iconKey: "columns",
                    toolPanel: "agColumnsToolPanel",
                  },
                  {
                    id: "filters",
                    labelDefault: "Filtros",
                    labelKey: "filters",
                    iconKey: "filter",
                    toolPanel: "agFiltersToolPanel",
                  },
                ],
                defaultToolPanel: "",
              }}
              rowGroupPanelShow="always"
              groupDisplayType="groupRows"
              pagination
              paginationPageSize={50}
              paginationPageSizeSelector={[25, 50, 100, 200]}
              suppressCellFocus
              enableCellTextSelection
              ensureDomOrder
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

