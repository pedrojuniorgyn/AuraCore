"use client";

import { useTenant } from "@/contexts/tenant-context";
import { usePermissions } from "@/hooks/usePermissions";
import { AuditParcelasGrid } from "@/components/audit/audit-parcelas-grid";

export default function AuditoriaContasReceberPage() {
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
    <AuditParcelasGrid
      operacao="RECEBIMENTO"
      title="Auditoria — Contas a Receber"
      subtitle="Parcelas (crédito) provenientes do AuditFinDB (snapshot) — padrão Financeiro (AG Grid Premium)"
    />
  );
}

