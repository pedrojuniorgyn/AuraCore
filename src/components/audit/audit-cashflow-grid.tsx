"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import type { ColDef, IDetailCellRendererParams } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, RefreshCw, Filter, TrendingUp, TrendingDown, Sigma, Wallet } from "lucide-react";

import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";

// AG Grid CSS + Aurora theme
import "ag-grid-community/styles/ag-theme-quartz.css";
import "@/styles/aurora-premium-grid.css";
import { PremiumCurrencyCell, PremiumDateCell } from "@/lib/ag-grid/aurora-premium-cells";

ModuleRegistry.registerModules([AllEnterpriseModule]);

export type AuditCashflowRow = {
  runId: string;
  date: string | null; // YYYY-MM-DD
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

function sum(values: Array<number | null | undefined>) {
  return values.reduce((acc, v) => acc + (Number(v ?? 0) || 0), 0);
}

function CashflowDetailCellRenderer(props: IDetailCellRendererParams) {
  const row = props.data as AuditCashflowRow;
  return (
    <div className="p-4 bg-gradient-to-br from-gray-900/50 to-purple-900/10">
      <h4 className="text-sm font-semibold text-purple-300 mb-3">🔎 Detalhes — Fluxo de Caixa (dia)</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-purple-500/20 bg-black/20 p-3">
          <div className="text-xs text-slate-400 mb-1">Chaves</div>
          <div>Data: <span className="font-mono">{row.date ?? "-"}</span></div>
          <div>Conta: <span className="font-mono">{row.contaBancariaId ?? "-"}</span></div>
          <div>Filial legada: <span className="font-mono">{row.codigoEmpresaFilial ?? "-"}</span></div>
          <div>Branch: <span className="font-mono">{row.branchId ?? "-"}</span></div>
        </div>
        <div className="rounded-lg border border-purple-500/20 bg-black/20 p-3">
          <div className="text-xs text-slate-400 mb-1">Saldos</div>
          <div>Inicial: <span className="font-mono">{row.saldoInicial ?? "-"}</span></div>
          <div>Final: <span className="font-mono">{row.saldoFinal ?? "-"}</span></div>
          <div>Status: <span className="font-mono">{row.statusCaixa ?? "-"}</span></div>
        </div>
        <div className="rounded-lg border border-purple-500/20 bg-black/20 p-3">
          <div className="text-xs text-slate-400 mb-1">Execução</div>
          <div className="text-xs text-slate-400">startedAt:</div>
          <div className="font-mono text-xs break-all">{row.startedAt ?? "-"}</div>
          <div className="text-xs text-slate-400 mt-2">runId:</div>
          <div className="font-mono text-xs break-all">{row.runId}</div>
        </div>
      </div>
    </div>
  );
}

export function AuditCashflowGrid(props: { title: string; subtitle: string }) {
  const gridRef = useRef<AgGridReact>(null);
  const [items, setItems] = useState<AuditCashflowRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [dateField, setDateField] = useState<"DATA" | "SNAPSHOT">("DATA");
  const [preset, setPreset] = useState<"7d" | "30d" | "3m" | "6m" | "12m" | "24m" | "36m" | "custom" | "all">("30d");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [limit, setLimit] = useState<2000 | 5000 | 10000>(5000);
  const [runId, setRunId] = useState("");
  const [status, setStatus] = useState<"ALL" | string>("ALL");
  const [quick, setQuick] = useState("");

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
      qs.set("limit", String(limit));
      if (startDate) qs.set("startDate", startDate);
      if (endDate) qs.set("endDate", endDate);
      if (startDate || endDate) qs.set("dateField", dateField);
      if (!startDate && !endDate && preset === "7d") qs.set("sinceDays", "7");
      if (!startDate && !endDate && preset === "30d") qs.set("sinceDays", "30");
      if (runId.trim()) qs.set("runId", runId.trim());

      const res = await fetch(`/api/admin/audit/cashflow?${qs.toString()}`, {
        headers: { "x-audit-debug": "1" },
        credentials: "include",
      });
      const data = await readJsonOrThrow(res);
      if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha ao carregar fluxo de caixa");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      toast.error("Falha ao carregar Fluxo de Caixa (Auditoria)", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, [dateField, endDate, limit, preset, runId, startDate]);

  useEffect(() => {
    void load();
  }, [load]);

  // quick filter (grid)
  useEffect(() => {
    gridRef.current?.api?.setGridOption("quickFilterText", quick);
  }, [quick]);

  const filtered = useMemo(() => {
    if (status === "ALL") return items;
    const s = String(status).toUpperCase();
    return items.filter((x) => String(x.statusCaixa ?? "").toUpperCase() === s);
  }, [items, status]);

  const kpis = useMemo(() => {
    const entradas = sum(filtered.map((x) => x.entradas));
    const saidas = sum(filtered.map((x) => x.saidas));
    const liquido = sum(filtered.map((x) => x.liquido));
    const saldoFinal = sum(filtered.map((x) => x.saldoFinal));
    return { entradas, saidas, liquido, saldoFinal, count: filtered.length };
  }, [filtered]);

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; entradas: number; saidas: number; liquido: number }>();
    for (const it of filtered) {
      const key = String(it.date ?? "");
      if (!key) continue;
      const row = map.get(key) ?? { date: key, entradas: 0, saidas: 0, liquido: 0 };
      row.entradas += Number(it.entradas ?? 0);
      row.saidas += Number(it.saidas ?? 0);
      row.liquido += Number(it.liquido ?? 0);
      map.set(key, row);
    }
    const rows = Array.from(map.values());
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows;
  }, [filtered]);

  const statusOptions = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) {
      const v = String(it.statusCaixa ?? "").trim();
      if (v) s.add(v.toUpperCase());
    }
    return Array.from(s).sort();
  }, [items]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        headerName: "Data",
        field: "date",
        width: 140,
        cellRenderer: PremiumDateCell,
        filter: "agDateColumnFilter",
      },
      { headerName: "Conta", field: "contaBancariaId", width: 130, filter: "agNumberColumnFilter" },
      { headerName: "Filial legada", field: "codigoEmpresaFilial", width: 140, filter: "agNumberColumnFilter" },
      {
        headerName: "Entradas",
        field: "entradas",
        width: 160,
        type: "numericColumn",
        cellRenderer: PremiumCurrencyCell,
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Saídas",
        field: "saidas",
        width: 160,
        type: "numericColumn",
        cellRenderer: PremiumCurrencyCell,
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Líquido",
        field: "liquido",
        width: 160,
        type: "numericColumn",
        cellRenderer: PremiumCurrencyCell,
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Saldo Inicial",
        field: "saldoInicial",
        width: 180,
        type: "numericColumn",
        cellRenderer: PremiumCurrencyCell,
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Saldo Final",
        field: "saldoFinal",
        width: 180,
        type: "numericColumn",
        cellRenderer: PremiumCurrencyCell,
        filter: "agNumberColumnFilter",
      },
      { headerName: "Status", field: "statusCaixa", width: 180, filter: "agSetColumnFilter" },
      { headerName: "Branch", field: "branchId", width: 120, filter: "agNumberColumnFilter" },
      { headerName: "RunId", field: "runId", width: 320, filter: "agTextColumnFilter" },
      {
        headerName: "StartedAt",
        field: "startedAt",
        width: 220,
        cellRenderer: PremiumDateCell,
        filter: "agDateColumnFilter",
        hide: true,
      },
    ],
    []
  );

  const exportCsv = () => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: "auditoria-fluxo-caixa.csv" });
  };

  return (
    <PageTransition>
      <div className="p-8 space-y-6">
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                <span className="inline-flex items-center gap-2">
                  <Wallet className="h-8 w-8 text-purple-300" />
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
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Dias/linhas</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.count} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-emerald-500/30">
                <div className="p-6 bg-gradient-to-br from-emerald-900/10 to-emerald-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Entradas</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                    {kpis.entradas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.25}>
              <GlassmorphismCard className="border-red-500/30">
                <div className="p-6 bg-gradient-to-br from-red-900/10 to-red-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Saídas</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                    {kpis.saidas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.3}>
              <GlassmorphismCard className="border-blue-500/30">
                <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Líquido</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent inline-flex items-center gap-2">
                    {kpis.liquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    {kpis.liquido >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-300" />
                    )}
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.35}>
              <GlassmorphismCard className="border-purple-500/30">
                <div className="p-6 bg-gradient-to-br from-purple-900/10 to-purple-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Saldo Final (soma)</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent inline-flex items-center gap-2">
                    <Sigma className="h-4 w-4 text-purple-300" />
                    {kpis.saldoFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* Gráfico */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm font-medium text-muted-foreground mb-3">Evolução por dia</div>
          <div className="h-72 bg-muted/10 rounded p-2">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any) =>
                      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0))
                    }
                  />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="#22c55e" opacity={0.85} />
                  <Bar dataKey="saidas" name="Saídas" fill="#ef4444" opacity={0.85} />
                  <Line dataKey="liquido" name="Líquido" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">Sem dados no período.</div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtros</span>
          </div>

          <Select value={preset} onValueChange={(v) => setPreset(v as any)}>
            <SelectTrigger className="w-[160px]">
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
              <SelectItem value="DATA">Data do movimento (dia)</SelectItem>
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

          <Select value={status} onValueChange={(v) => setStatus(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Status do caixa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="runId (UUID)" className="w-[280px]" />
          <Input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder="Busca rápida (grid)"
            className="w-[260px]"
          />

          <Button variant="secondary" onClick={load} disabled={loading}>
            Aplicar
          </Button>

          <div className="text-xs text-muted-foreground ml-auto">
            Dica: filtros nas colunas do grid atuam <strong>apenas</strong> sobre as linhas já carregadas. Para buscar períodos
            antigos, ajuste o período/De/Até acima.
          </div>
        </div>

        {/* Grid */}
        <div className="aurora-premium-grid">
          <div className="ag-theme-quartz-dark" style={{ height: "70vh", width: "100%" }}>
            <AgGridReact
              ref={gridRef}
              rowData={filtered}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                resizable: true,
                filter: true,
                floatingFilter: true,
                enableRowGroup: true,
              }}
              masterDetail
              detailCellRenderer={CashflowDetailCellRenderer}
              detailRowAutoHeight
              animateRows
              enableRangeSelection
              rowGroupPanelShow="always"
              groupDisplayType="groupRows"
              pagination
              paginationPageSize={50}
              paginationPageSizeSelector={[25, 50, 100, 200]}
              suppressCellFocus
              enableCellTextSelection
              ensureDomOrder
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
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

