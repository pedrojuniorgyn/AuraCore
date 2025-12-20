"use client";

import { useTenant } from "@/contexts/tenant-context";
import { usePermissions } from "@/hooks/usePermissions";
import { AuditParcelasGrid } from "@/components/audit/audit-parcelas-grid";

export default function AuditoriaContasPagarPage() {
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
      operacao="PAGAMENTO"
      title="Auditoria — Contas a Pagar"
      subtitle="Parcelas (débito) provenientes do AuditFinDB (snapshot) — padrão Financeiro (AG Grid Premium)"
    />
  );
}

