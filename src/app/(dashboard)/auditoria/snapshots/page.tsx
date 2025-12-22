"use client";

import { useTenant } from "@/contexts/tenant-context";
import { usePermissions } from "@/hooks/usePermissions";
import { AuditSnapshotsGrid } from "@/components/audit/audit-snapshots-grid";

export default function AuditSnapshotsPage() {
  const { user, isLoading } = useTenant();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const canRead = user?.role === "ADMIN" || hasPermission("audit.read");
  const canRun = user?.role === "ADMIN" || hasPermission("audit.run");
  const canMigrate = user?.role === "ADMIN" || hasPermission("audit.migrate");

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

  return <AuditSnapshotsGrid canRun={canRun} canMigrate={canMigrate} />;
}

