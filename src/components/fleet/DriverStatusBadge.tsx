/**
 * 👤 Driver Status Badge
 * Badge colorida para status do motorista
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Plane, Ban, XCircle } from "lucide-react";
import { getStatusConfig } from "@/lib/utils/status-colors";

interface DriverStatusBadgeProps {
  status: string;
  cnhExpiry?: Date | string;
}

export function DriverStatusBadge({ status, cnhExpiry }: DriverStatusBadgeProps) {
  // Verificar se CNH está vencida
  const isCnhExpired = cnhExpiry && new Date(cnhExpiry) < new Date();

  // Se CNH vencida, sempre mostrar como BLOQUEADO
  const effectiveStatus = isCnhExpired ? "BLOCKED" : status;

  const iconMap: Record<string, unknown> = {
    ACTIVE: CheckCircle2,
    VACATION: Plane,
    BLOCKED: Ban,
    INACTIVE: XCircle,
  };

  const statusConfig = getStatusConfig(effectiveStatus, isCnhExpired ? "CNH Vencida" : undefined);
  const Icon = iconMap[effectiveStatus] || CheckCircle2;

  return (
    <Badge variant={statusConfig.variant} className={`gap-1 ${statusConfig.className}`}>
      <Icon className="h-3 w-3" />
      {statusConfig.label}
    </Badge>
  );
}


