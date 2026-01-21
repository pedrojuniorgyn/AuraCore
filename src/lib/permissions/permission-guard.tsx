'use client';

/**
 * Guard de permissões para o módulo Strategic
 * @module lib/permissions/permission-guard
 */

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { AccessDenied } from '@/components/strategic/permissions/AccessDenied';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  mode?: 'all' | 'any';
  fallback?: ReactNode;
  showAccessDenied?: boolean;
}

export function PermissionGuard({
  children,
  permission,
  permissions,
  mode = 'all',
  fallback = null,
  showAccessDenied = false,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) {
    return null; // Or loading spinner
  }

  let hasAccess = false;

  if (permission) {
    // Single permission check
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    // Multiple permissions check
    hasAccess = mode === 'any' ? hasAnyPermission(permissions) : hasAllPermissions(permissions);
  } else {
    // No permissions specified, allow access
    hasAccess = true;
  }

  if (!hasAccess) {
    if (showAccessDenied) {
      return <AccessDenied />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// HOC version for wrapping pages
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: string
) {
  return function ProtectedComponent(props: P) {
    return (
      <PermissionGuard permission={permission} showAccessDenied>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}
