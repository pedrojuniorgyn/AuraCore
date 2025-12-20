"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, RefreshCw, Filter, AlertCircle, ShieldAlert, ShieldCheck, Info, Eye } from "lucide-react";

// AG Grid CSS + Aurora theme
import "ag-grid-community/styles/ag-theme-quartz.css";
import "@/styles/aurora-premium-grid.css";

ModuleRegistry.registerModules([AllEnterpriseModule]);

export type AuditFinding = {
  id: string;
  runId: string;
  ruleCode: string;
  severity: "INFO" | "WARN" | "ERROR" | string;
  entityType: string;
  entityId: string | null;
  message: string;
  evidenceJson: string | null;
  startedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  branchId: number | null;
  organizationId?: number | null;
};

async function readJsonOrThrow(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return await res.json();
  const text = await res.text().catch(() => "");
  const snippet = text ? ` — ${text.slice(0, 200)}` : "";
  throw new Error(`HTTP ${res.status} ${res.statusText} (resposta não-JSON)${snippet}`);
}

function SeverityCell(props: ICellRendererParams) {
  const s = String(props.value ?? "").toUpperCase();
  const config =
    s === "ERROR"
      ? { label: "ERROR", color: "#FCA5A5", bg: "rgba(239,68,68,0.18)", icon: ShieldAlert }
      : s === "WARN"
        ? { label: "WARN", color: "#FCD34D", bg: "rgba(251,191,36,0.18)", icon: AlertCircle }
        : { label: "INFO", color: "#93C5FD", bg: "rgba(59,130,246,0.18)", icon: Info };
  const Icon = config.icon;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        borderRadius: "12px",
        background: config.bg,
        border: `1px solid ${config.color}40`,
        color: config.color,
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "0.4px",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </div>
  );
}

function dateIsoToBr(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("pt-BR");
}

function truncate(s: string | null | undefined, max = 140) {
  if (!s) return "";
  const t = String(s);
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function EvidenceActionCell(props: ICellRendererParams) {
  const onView = (props.context as any)?.onViewEvidence as ((row: AuditFinding) => void) | undefined;
  const hasEvidence = Boolean((props.data as any)?.evidenceJson);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={!hasEvidence}
        title={hasEvidence ? "Ver evidência" : "Sem evidência"}
        onClick={() => onView?.(props.data as AuditFinding)}
        style={{
          padding: "6px",
          borderRadius: "8px",
          border: `1px solid ${hasEvidence ? "rgba(139,92,246,0.35)" : "rgba(100,116,139,0.25)"}`,
          background: hasEvidence ? "rgba(139,92,246,0.12)" : "rgba(15,23,42,0.25)",
          color: hasEvidence ? "#A78BFA" : "#64748B",
          cursor: hasEvidence ? "pointer" : "not-allowed",
        }}
      >
        <Eye className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AuditFindingsGrid(props: { title: string; subtitle: string }) {
  const gridRef = useRef<AgGridReact>(null);
  const [items, setItems] = useState<AuditFinding[]>([]);
  const [loading, setLoading] = useState(false);

  const [sinceDays, setSinceDays] = useState<0 | 7 | 30>(7);
  const [severity, setSeverity] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const [runId, setRunId] = useState("");
  const [ruleQuery, setRuleQuery] = useState("");

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selected, setSelected] = useState<AuditFinding | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "500");
      if (sinceDays) qs.set("sinceDays", String(sinceDays));
      if (severity !== "ALL") qs.set("severity", severity);
      if (runId.trim()) qs.set("runId", runId.trim());

      const res = await fetch(`/api/admin/audit/findings?${qs.toString()}`, {
        headers: { "x-audit-debug": "1" },
        credentials: "include",
      });
      const data = await readJsonOrThrow(res);
      if (!res.ok || !data?.success) throw new Error(data?.error ?? "Falha ao listar achados");

      const rows = Array.isArray(data.items) ? (data.items as AuditFinding[]) : [];
      setItems(rows);
    } catch (e) {
      toast.error("Falha ao carregar achados (Auditoria)", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, [runId, severity, sinceDays]);

  useEffect(() => {
    void load();
  }, [load]);

  // aplica quick filter local (rule/message/entity)
  useEffect(() => {
    gridRef.current?.api?.setGridOption("quickFilterText", ruleQuery);
  }, [ruleQuery]);

  const kpis = useMemo(() => {
    const total = items.length;
    const errors = items.filter((x) => String(x.severity).toUpperCase() === "ERROR").length;
    const warns = items.filter((x) => String(x.severity).toUpperCase() === "WARN").length;
    const infos = items.filter((x) => String(x.severity).toUpperCase() === "INFO").length;
    const rules = new Set(items.map((x) => x.ruleCode)).size;
    return { total, errors, warns, infos, rules };
  }, [items]);

  const onViewEvidence = useCallback((row: AuditFinding) => {
    setSelected(row);
    setEvidenceOpen(true);
  }, []);

  const gridContext = useMemo(() => ({ onViewEvidence }), [onViewEvidence]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        headerName: "Severidade",
        field: "severity",
        width: 160,
        cellRenderer: SeverityCell,
        filter: "agSetColumnFilter",
      },
      { headerName: "Regra", field: "ruleCode", width: 220, filter: "agTextColumnFilter" },
      { headerName: "Mensagem", field: "message", flex: 1, minWidth: 420, filter: "agTextColumnFilter" },
      {
        headerName: "Entidade",
        width: 220,
        valueGetter: (p) => {
          const et = (p.data as any)?.entityType ?? "";
          const ei = (p.data as any)?.entityId ?? "";
          return ei ? `${et} #${ei}` : String(et);
        },
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Período",
        width: 220,
        valueGetter: (p) => {
          const a = (p.data as any)?.periodStart ?? "";
          const b = (p.data as any)?.periodEnd ?? "";
          return a && b ? `${a} → ${b}` : a || b || "-";
        },
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Início",
        field: "startedAt",
        width: 200,
        valueFormatter: (p) => dateIsoToBr(p.value),
      },
      { headerName: "Branch", field: "branchId", width: 120, filter: "agNumberColumnFilter" },
      { headerName: "RunId", field: "runId", width: 320, filter: "agTextColumnFilter" },
      {
        headerName: "Evidência",
        width: 110,
        cellRenderer: EvidenceActionCell,
        sortable: false,
        filter: false,
        pinned: "right",
      },
    ],
    []
  );

  const exportCsv = () => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: "auditoria-conciliacao-achados.csv" });
  };

  const evidenceText = useMemo(() => {
    const raw = selected?.evidenceJson;
    if (!raw) return null;
    try {
      const obj = JSON.parse(raw);
      return JSON.stringify(obj, null, 2);
    } catch {
      return raw;
    }
  }, [selected]);

  return (
    <PageTransition>
      <div className="p-8 space-y-6">
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-8 w-8 text-purple-300" />
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
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.total} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-red-500/30">
                <div className="p-6 bg-gradient-to-br from-red-900/10 to-red-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">ERROR</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.errors} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.25}>
              <GlassmorphismCard className="border-amber-500/30">
                <div className="p-6 bg-gradient-to-br from-amber-900/10 to-amber-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">WARN</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.warns} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.3}>
              <GlassmorphismCard className="border-blue-500/30">
                <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">INFO</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.infos} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
            <FadeIn delay={0.35}>
              <GlassmorphismCard className="border-purple-500/30">
                <div className="p-6 bg-gradient-to-br from-purple-900/10 to-purple-800/5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Regras</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    <NumberCounter value={kpis.rules} />
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

          <Select value={String(sinceDays)} onValueChange={(v) => setSinceDays((Number(v) as any) ?? 7)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="0">Histórico</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              <SelectItem value="ERROR">ERROR</SelectItem>
              <SelectItem value="WARN">WARN</SelectItem>
              <SelectItem value="INFO">INFO</SelectItem>
            </SelectContent>
          </Select>

          <Input value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="runId (UUID)" className="w-[280px]" />
          <Input
            value={ruleQuery}
            onChange={(e) => setRuleQuery(e.target.value)}
            placeholder="Buscar (regra/mensagem/entidade)"
            className="w-[320px]"
          />

          <Button variant="secondary" onClick={load} disabled={loading}>
            Aplicar
          </Button>
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
              context={gridContext}
              animateRows
              pagination
              paginationPageSize={50}
              paginationPageSizeSelector={[25, 50, 100, 200]}
              loading={loading}
              loadingOverlayComponent={() => (
                <div className="flex flex-col items-center justify-center p-8">
                  <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mb-4" />
                  <p className="text-purple-300">Carregando achados...</p>
                </div>
              )}
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

        <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Evidência (Achado)</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <div className="font-mono text-xs">{selected?.runId ?? "-"}</div>
                <div className="font-medium">{selected?.ruleCode ?? "-"}</div>
                <div className="text-sm">{truncate(selected?.message, 240)}</div>
              </div>
              <pre className="text-xs bg-muted/30 border border-border rounded-lg p-3 overflow-auto max-h-[60vh]">
{evidenceText ?? "Sem evidência para este achado."}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

