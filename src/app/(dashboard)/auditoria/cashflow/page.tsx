"use client";

import { useTenant } from "@/contexts/tenant-context";
import { usePermissions } from "@/hooks/usePermissions";
import { AuditCashflowGrid } from "@/components/audit/audit-cashflow-grid";

export default function AuditCashflowPage() {
  const { user, isLoading } = useTenant();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const canRead = user?.role === "ADMIN" || hasPermission("audit.read");

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
    <AuditCashflowGrid
      title="Auditoria — Fluxo de Caixa"
      subtitle="Baseado no AuditFinDB (snapshot) — padrão Financeiro (KPIs + gráfico + AG Grid Premium)"
    />
  );
}

