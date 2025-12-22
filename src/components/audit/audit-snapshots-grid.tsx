"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import type { ColDef, ICellRendererParams, IDetailCellRendererParams, IServerSideDatasource, IServerSideGetRowsParams } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, RefreshCw, Filter, PlayCircle, Wrench, Trash2, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

// AG Grid CSS + Aurora theme
import "ag-grid-community/styles/ag-theme-quartz.css";
import "@/styles/aurora-premium-grid.css";
import { PremiumDateCell } from "@/lib/ag-grid/aurora-premium-cells";

ModuleRegistry.registerModules([AllEnterpriseModule]);

export type AuditSnapshotRow = {
  runId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  periodStart: string | null; // YYYY-MM-DD
  periodEnd: string | null; // YYYY-MM-DD
  errorMessage: string | null;
  organizationId: number | null;
  branchId: number | null;
  legacyCompanyBranchCode: number | null;
  requestedByUserId: string | null;
  requestedByEmail: string | null;
};

async function readJsonOrThrow(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return await res.json();
  const text = await res.text().catch(() => "");
  const snippet = text ? ` — ${text.slice(0, 200)}` : "";
  throw new Error(`HTTP ${res.status} ${res.statusText} (resposta não-JSON)${snippet}`);
}

function StatusPill(props: { value: string }) {
  const s = String(props.value ?? "").toUpperCase();
  const cfg =
    s === "SUCCEEDED"
      ? { label: "SUCCEEDED", color: "#6EE7B7", bg: "rgba(16,185,129,0.18)", icon: CheckCircle2 }
      : s === "FAILED"
        ? { label: "FAILED", color: "#FCA5A5", bg: "rgba(239,68,68,0.18)", icon: XCircle }
        : s === "RUNNING"
          ? { label: "RUNNING", color: "#93C5FD", bg: "rgba(59,130,246,0.18)", icon: Loader2 }
          : s === "QUEUED"
            ? { label: "QUEUED", color: "#FCD34D", bg: "rgba(251,191,36,0.18)", icon: Clock }
            : { label: s || "—", color: "#A78BFA", bg: "rgba(139,92,246,0.12)", icon: Clock };
  const Icon = cfg.icon;
  const spinning = s === "RUNNING";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        borderRadius: "12px",
        background: cfg.bg,
        border: `1px solid ${cfg.color}40`,
        color: cfg.color,
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "0.4px",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      <Icon className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`} />
      {cfg.label}
    </div>
  );
}

function DetailCellRenderer(props: IDetailCellRendererParams) {
  const row = props.data as AuditSnapshotRow;
  return (
    <div className="p-4 bg-gradient-to-br from-gray-900/50 to-purple-900/10">
      <h4 className="text-sm font-semibold text-purple-300 mb-3">🔎 Detalhes — Snapshot run</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-purple-500/20 bg-black/20 p-3">
          <div className="text-xs text-slate-400 mb-1">Identificação</div>
          <div className="font-mono text-xs break-all">{row.runId}</div>
          <div className="text-xs text-slate-400 mt-2">Org/Branch</div>
          <div className="font-mono text-xs">
            org: {row.organizationId ?? "-"} • branch: {row.branchId ?? "-"} • legado: {row.legacyCompanyBranchCode ?? "-"}
          </div>
        </div>
        <div className="rounded-lg border border-purple-500/20 bg-black/20 p-3">
          <div className="text-xs text-slate-400 mb-1">Período</div>
          <div className="font-mono text-xs">{row.periodStart ?? "-"} → {row.periodEnd ?? "-"}</div>
          <div className="text-xs text-slate-400 mt-2">Execução</div>
          <div className="font-mono text-xs">início: {row.startedAt ?? "-"}</div>
          <div className="font-mono text-xs">fim: {row.finishedAt ?? "-"}</div>
        </div>
        <div className="rounded-lg border border-purple-500/20 bg-black/20 p-3">
          <div className="text-xs text-slate-400 mb-1">Solicitante</div>
          <div className="text-slate-200">{row.requestedByEmail ?? "-"}</div>
          <div className="font-mono text-xs text-slate-400">{row.requestedByUserId ?? "-"}</div>
          <div className="text-xs text-slate-400 mt-2">Erro</div>
          <div className="text-xs text-red-300 break-words">{row.errorMessage ?? "-"}</div>
        </div>
      </div>
    </div>
  );
}

function ActionsCell(props: ICellRendererParams) {
  const onRerun = (props.context as any)?.onRerun as ((runId: string) => void) | undefined;
  const runId = String((props.data as any)?.runId ?? "");
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        title="Recarregar (purge) e atualizar KPIs"
        onClick={() => onRerun?.(runId)}
        style={{
          padding: "6px",
          borderRadius: "8px",
          border: "1px solid rgba(139,92,246,0.35)",
          background: "rgba(139,92,246,0.12)",
          color: "#A78BFA",
          cursor: "pointer",
        }}
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AuditSnapshotsGrid(props: {
  canRun: boolean;
  canMigrate: boolean;
}) {
  const gridRef = useRef<AgGridReact>(null);
  const [loading, setLoading] = useState(false);
  const [kpisLoading, setKpisLoading] = useState(false);
  const [busy, setBusy] = useState<"run" | "migrate" | "cleanup" | null>(null);

  const [kpis, setKpis] = useState<{ total: number; succeeded: number; failed: number; running: number; queued: number }>({
    total: 0,
    succeeded: 0,
    failed: 0,
    running: 0,
    queued: 0,
  });

  const [preset, setPreset] = useState<"7d" | "30d" | "custom" | "all">("30d");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [status, setStatus] = useState<string>("ALL");
  const [runId, setRunId] = useState<string>("");
  const [pageSize, setPageSize] = useState<50 | 100 | 200>(100);

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
      const days = p === "7d" ? 7 : 30;
      const start = new Date(today.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    },
    [setEndDate, setStartDate]
  );

  useEffect(() => {
    applyPreset(preset);
  }, [applyPreset, preset]);

  const query = useMemo(() => {
    const q: any = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status !== "ALL" ? status : undefined,
      runId: runId.trim() || undefined,
    };
    if (!q.startDate && !q.endDate && preset === "7d") q.sinceDays = 7;
    if (!q.startDate && !q.endDate && preset === "30d") q.sinceDays = 30;
    return q;
  }, [endDate, preset, runId, startDate, status]);

  const loadKpis = useCallback(async () => {
    setKpisLoading(true);
    try {
      const qs = new URLSearchParams();
      if (query.sinceDays) qs.set("sinceDays", String(query.sinceDays));
      if (query.startDate) qs.set("startDate", String(query.startDate));
      if (query.endDate) qs.set("endDate", String(query.endDate));
      if (query.status) qs.set("status", String(query.status));
      if (query.runId) qs.set("runId", String(query.runId));
      const res = await fetch(`/api/admin/audit/snapshots/summary?${qs.toString()}`, {
        headers: { "x-audit-debug": "1" },
        credentials: "include",
      });
      const data = await readJsonOrThrow(res);
      if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha KPIs");
      setKpis({
        total: Number(data?.kpis?.total ?? 0),
        succeeded: Number(data?.kpis?.succeeded ?? 0),
        failed: Number(data?.kpis?.failed ?? 0),
        running: Number(data?.kpis?.running ?? 0),
        queued: Number(data?.kpis?.queued ?? 0),
      });
    } catch (e) {
      toast.error("Falha ao carregar KPIs (Snapshots)", { description: e instanceof Error ? e.message : String(e) });
      setKpis({ total: 0, succeeded: 0, failed: 0, running: 0, queued: 0 });
    } finally {
      setKpisLoading(false);
    }
  }, [query]);

  const datasource = useMemo<IServerSideDatasource>(
    () => ({
      getRows: async (params: IServerSideGetRowsParams) => {
        setLoading(true);
        try {
          const req = params.request as any;
          const res = await fetch("/api/admin/audit/snapshots/ssrm", {
            method: "POST",
            headers: { "content-type": "application/json", "x-audit-debug": "1" },
            credentials: "include",
            body: JSON.stringify({
              startRow: req.startRow ?? 0,
              endRow: req.endRow ?? pageSize,
              sortModel: Array.isArray(req.sortModel) ? req.sortModel : [],
              filterModel: req.filterModel ?? {},
              query,
            }),
          });
          const data = await readJsonOrThrow(res);
          if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha SSRM");
          params.success({ rowData: Array.isArray(data.rows) ? data.rows : [], rowCount: Number(data.lastRow ?? 0) });
        } catch (e) {
          params.fail();
          toast.error("Falha ao carregar grid (Snapshots)", { description: e instanceof Error ? e.message : String(e) });
        } finally {
          setLoading(false);
        }
      },
    }),
    [pageSize, query]
  );

  const refresh = useCallback(() => {
    gridRef.current?.api?.refreshServerSide({ purge: true });
    void loadKpis();
  }, [loadKpis]);

  useEffect(() => {
    gridRef.current?.api?.setGridOption("serverSideDatasource", datasource);
    refresh();
  }, [datasource, refresh]);

  const runSnapshot = useCallback(async () => {
    if (!props.canRun) return;
    setBusy("run");
    try {
      const res = await fetch("/api/admin/audit/snapshots/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-audit-debug": "1" },
        credentials: "include",
        body: JSON.stringify({ axis: "VENCIMENTO" }),
      });
      const data = await readJsonOrThrow(res);
      if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha ao executar snapshot");
      toast.success("Snapshot enfileirado", { description: data?.runId ?? "" });
      refresh();
    } catch (e) {
      toast.error("Falha ao executar snapshot", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }, [props.canRun, refresh]);

  const migrate = useCallback(async () => {
    if (!props.canMigrate) return;
    setBusy("migrate");
    try {
      const res = await fetch("/api/admin/audit/snapshots/migrate", {
        method: "POST",
        headers: { "x-audit-debug": "1" },
        credentials: "include",
      });
      const data = await readJsonOrThrow(res);
      if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha ao migrar AuditFinDB");
      toast.success("Migração aplicada", { description: `appliedBy: ${data?.appliedBy ?? "-"}` });
      refresh();
    } catch (e) {
      toast.error("Falha ao migrar schema", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }, [props.canMigrate, refresh]);

  const cleanupFailedOld = useCallback(async () => {
    if (!props.canMigrate) return;
    setBusy("cleanup");
    try {
      const res = await fetch("/api/admin/audit/snapshots/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-audit-debug": "1" },
        credentials: "include",
        body: JSON.stringify({ olderThanDays: 30, onlyFailed: true }),
      });
      const data = await readJsonOrThrow(res);
      if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha ao limpar snapshots antigos");
      toast.success("Limpeza executada", { description: `runsDeleted: ${data?.runsDeleted ?? 0}` });
      refresh();
    } catch (e) {
      toast.error("Falha ao limpar falhas antigas", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }, [props.canMigrate, refresh]);

  const onRerun = useCallback(
    (_runId: string) => {
      // por enquanto a ação é "refresh" (não reexecuta o mesmo runId)
      refresh();
    },
    [refresh]
  );
  const gridContext = useMemo(() => ({ onRerun }), [onRerun]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        headerName: "Status",
        field: "status",
        width: 170,
        cellRenderer: (p: any) => <StatusPill value={String(p.value ?? "")} />,
        filter: "agSetColumnFilter",
      },
      { headerName: "RunId", field: "runId", width: 340, filter: "agTextColumnFilter" },
      { headerName: "Período (ini)", field: "periodStart", width: 140, filter: "agDateColumnFilter" },
      { headerName: "Período (fim)", field: "periodEnd", width: 140, filter: "agDateColumnFilter" },
      { headerName: "Início", field: "startedAt", width: 200, cellRenderer: PremiumDateCell, filter: "agDateColumnFilter" },
      { headerName: "Fim", field: "finishedAt", width: 200, cellRenderer: PremiumDateCell, filter: "agDateColumnFilter" },
      { headerName: "Branch", field: "branchId", width: 120, filter: "agNumberColumnFilter" },
      { headerName: "Legado", field: "legacyCompanyBranchCode", width: 120, filter: "agNumberColumnFilter", hide: true },
      { headerName: "Solicitante", field: "requestedByEmail", width: 220, filter: "agTextColumnFilter", hide: true },
      {
        headerName: "Erro",
        field: "errorMessage",
        flex: 1,
        minWidth: 320,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Ações",
        width: 90,
        cellRenderer: ActionsCell,
        sortable: false,
        filter: false,
        pinned: "right",
      },
    ],
    []
  );

  const exportCsv = () => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: "auditoria-snapshots.csv" });
  };

  return (
    <PageTransition>
      <div className="p-8 space-y-6">
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                Auditoria — Snapshots
              </h1>
              <p className="text-slate-400 mt-1">Execução e acompanhamento do ETL no AuditFinDB — SSRM (paginação real)</p>
            </div>
            <div className="flex items-center gap-2">
              <RippleButton asChild disabled={loading || busy !== null} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500">
                <button onClick={refresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {loading ? "Atualizando..." : "Atualizar"}
                </button>
              </RippleButton>
              <Button variant="outline" onClick={exportCsv} disabled={loading || busy !== null}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button variant="outline" onClick={migrate} disabled={!props.canMigrate || loading || busy !== null}>
                <Wrench className="w-4 h-4 mr-2" />
                {busy === "migrate" ? "Migrando..." : "Migrar schema"}
              </Button>
              <Button variant="outline" onClick={cleanupFailedOld} disabled={!props.canMigrate || loading || busy !== null}>
                <Trash2 className="w-4 h-4 mr-2" />
                {busy === "cleanup" ? "Limpando..." : "Limpar falhas"}
              </Button>
              <Button onClick={runSnapshot} disabled={!props.canRun || loading || busy !== null}>
                <PlayCircle className="w-4 h-4 mr-2" />
                {busy === "run" ? "Executando..." : "Rodar snapshot"}
              </Button>
            </div>
          </div>
        </FadeIn>

        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <FadeIn delay={0.15}>
              <GlassmorphismCard className="border-cyan-500/30">
                <div className="p-6 bg-gradient-to-br from-cyan-900/10 to-cyan-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.total} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-emerald-500/30">
                <div className="p-6 bg-gradient-to-br from-emerald-900/10 to-emerald-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">SUCCEEDED</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.succeeded} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.25}>
              <GlassmorphismCard className="border-red-500/30">
                <div className="p-6 bg-gradient-to-br from-red-900/10 to-red-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">FAILED</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.failed} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.3}>
              <GlassmorphismCard className="border-blue-500/30">
                <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">RUNNING</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.running} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.35}>
              <GlassmorphismCard className="border-amber-500/30">
                <div className="p-6 bg-gradient-to-br from-amber-900/10 to-amber-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">QUEUED</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.queued} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

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
              <SelectItem value="custom">Personalizado</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
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
            title="Data inicial (startedAt)"
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
            title="Data final (startedAt)"
          />

          <Select value={status} onValueChange={(v) => setStatus(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="SUCCEEDED">SUCCEEDED</SelectItem>
              <SelectItem value="FAILED">FAILED</SelectItem>
              <SelectItem value="RUNNING">RUNNING</SelectItem>
              <SelectItem value="QUEUED">QUEUED</SelectItem>
            </SelectContent>
          </Select>

          <Input value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="runId (UUID)" className="w-[320px]" />

          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Linhas/página" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="secondary" onClick={refresh} disabled={loading || busy !== null}>
            Aplicar
          </Button>
        </div>

        {/* Grid */}
        <div className="aurora-premium-grid">
          <div className="ag-theme-quartz-dark" style={{ height: "70vh", width: "100%" }}>
            <AgGridReact
              ref={gridRef}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                resizable: true,
                filter: true,
                floatingFilter: true,
              }}
              context={gridContext}
              rowModelType="serverSide"
              serverSideDatasource={datasource}
              masterDetail
              detailCellRenderer={DetailCellRenderer}
              detailRowAutoHeight
              animateRows
              enableRangeSelection
              pagination
              paginationPageSize={pageSize}
              cacheBlockSize={pageSize}
              maxBlocksInCache={5}
              suppressCellFocus
              enableCellTextSelection
              ensureDomOrder
              sideBar={{
                toolPanels: [
                  { id: "columns", labelDefault: "Colunas", labelKey: "columns", iconKey: "columns", toolPanel: "agColumnsToolPanel" },
                  { id: "filters", labelDefault: "Filtros", labelKey: "filters", iconKey: "filter", toolPanel: "agFiltersToolPanel" },
                ],
                defaultToolPanel: "",
              }}
              loading={loading || kpisLoading || busy !== null}
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

