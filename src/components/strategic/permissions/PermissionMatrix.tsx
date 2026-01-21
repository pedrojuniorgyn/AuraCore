'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import type { Role, Resource, Action } from '@/lib/permissions/permission-types';
import { RESOURCE_LABELS, ACTION_LABELS, RESOURCE_ACTIONS } from '@/lib/permissions/permission-types';

interface PermissionMatrixProps {
  roles: Role[];
  onTogglePermission?: (roleId: string, resource: Resource, action: Action, enabled: boolean) => void;
  editable?: boolean;
}

function PermissionMatrixInner({ roles, onTogglePermission, editable = false }: PermissionMatrixProps) {
  const [expandedResources, setExpandedResources] = useState<Resource[]>(
    Object.keys(RESOURCE_ACTIONS) as Resource[]
  );

  const hasPermission = (role: Role, resource: Resource, action: Action): boolean => {
    return role.permissions.some((p) => p.resource === resource && p.action === action);
  };

  const toggleResource = (resource: Resource) => {
    setExpandedResources((prev) =>
      prev.includes(resource) ? prev.filter((r) => r !== resource) : [...prev, resource]
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">
              Recurso / Ação
            </th>
            {roles.map((role) => (
              <th
                key={role.id}
                className="text-center py-3 px-4 text-white text-sm font-medium min-w-[100px]"
              >
                <div className="truncate max-w-[100px]" title={role.name}>
                  {role.name}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(Object.keys(RESOURCE_ACTIONS) as Resource[]).map((resource) => (
            <>
              {/* Resource header row */}
              <tr
                key={resource}
                className="bg-white/5 cursor-pointer hover:bg-white/10"
                onClick={() => toggleResource(resource)}
              >
                <td className="py-2 px-4 text-white font-medium">
                  <div className="flex items-center gap-2">
                    {expandedResources.includes(resource) ? (
                      <ChevronDown size={16} className="text-white/40" />
                    ) : (
                      <ChevronRight size={16} className="text-white/40" />
                    )}
                    {RESOURCE_LABELS[resource]}
                  </div>
                </td>
                {roles.map((role) => (
                  <td key={role.id} className="text-center py-2 px-4">
                    <span className="text-white/40 text-xs">
                      {RESOURCE_ACTIONS[resource].filter((a) => hasPermission(role, resource, a)).length}
                      /{RESOURCE_ACTIONS[resource].length}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Action rows (expanded) */}
              {expandedResources.includes(resource) &&
                RESOURCE_ACTIONS[resource].map((action) => (
                  <motion.tr
                    key={`${resource}-${action}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border-b border-white/5"
                  >
                    <td className="py-2 px-4 pl-10 text-white/70 text-sm">
                      {ACTION_LABELS[action]}
                    </td>
                    {roles.map((role) => {
                      const allowed = hasPermission(role, resource, action);
                      const isEditable = editable && !role.isSystem;

                      return (
                        <td key={role.id} className="text-center py-2 px-4">
                          <button
                            onClick={() =>
                              isEditable && onTogglePermission?.(role.id, resource, action, !allowed)
                            }
                            disabled={!isEditable}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center 
                              transition-all mx-auto
                              ${allowed ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/20'}
                              ${isEditable ? 'cursor-pointer hover:bg-white/10' : 'cursor-default'}`}
                          >
                            {allowed ? <Check size={16} /> : <X size={16} />}
                          </button>
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
            </>
          ))}
        </tbody>
      </table>

      <div className="mt-4 text-center text-white/40 text-sm">
        <Check size={14} className="inline text-green-400" /> = Permitido{' '}
        <X size={14} className="inline text-white/20 ml-4" /> = Negado
        {editable && ' (clique para alternar)'}
      </div>
    </div>
  );
}

export const PermissionMatrix = memo(PermissionMatrixInner);
