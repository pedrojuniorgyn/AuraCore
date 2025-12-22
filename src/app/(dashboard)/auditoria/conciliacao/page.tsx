"use client";

import { useTenant } from "@/contexts/tenant-context";
import { usePermissions } from "@/hooks/usePermissions";
import { AuditFindingsGrid } from "@/components/audit/audit-findings-grid";

export default function AuditoriaConciliacaoPage() {
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
    <AuditFindingsGrid
      title="Auditoria — Conciliação (Achados)"
      subtitle="Achados do AuditFinDB (snapshot) — padrão Financeiro (AG Grid Premium)"
    />
  );
}

