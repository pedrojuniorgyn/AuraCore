'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Users, Lock, Settings, Trash2 } from 'lucide-react';
import type { Role } from '@/lib/permissions/permission-types';

interface RoleManagerProps {
  roles: Role[];
  onCreateRole: () => void;
  onEditRole: (role: Role) => void;
  onDeleteRole: (roleId: string) => void;
  onViewDetails: (role: Role) => void;
}

function RoleManagerInner({
  roles,
  onCreateRole,
  onEditRole,
  onDeleteRole,
  onViewDetails,
}: RoleManagerProps) {
  const getRoleIcon = (role: Role) => {
    if (role.priority >= 100) return '👑';
    if (role.priority >= 70) return '📊';
    if (role.priority >= 60) return '📋';
    return '👁️';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="text-purple-400" size={24} />
          Papéis do Sistema
        </h2>
        <button
          onClick={onCreateRole}
          className="flex items-center gap-2 px-4 py-2 rounded-xl 
            bg-purple-500 text-white hover:bg-purple-600 transition-colors"
        >
          <Plus size={18} />
          Novo Papel
        </button>
      </div>

      {/* Roles List */}
      <div className="space-y-3">
        {roles.map((role, index) => (
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 
              hover:border-purple-500/30 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{getRoleIcon(role)}</div>
                <div>
                  <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    {role.name}
                    {role.isSystem && (
                      <span title="Papel do sistema">
                        <Lock size={14} className="text-white/40" />
                      </span>
                    )}
                  </h3>
                  <p className="text-white/60 text-sm mt-1">{role.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="flex items-center gap-1.5 text-white/50 text-sm">
                      <Users size={14} />
                      {role.userCount} usuários
                    </span>
                    <span className="text-white/30 text-sm">
                      {role.permissions.length} permissões
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!role.isSystem && (
                  <>
                    <button
                      onClick={() => onEditRole(role)}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/60 
                        hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Settings size={18} />
                    </button>
                    <button
                      onClick={() => onDeleteRole(role.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-white/60 
                        hover:text-red-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => onViewDetails(role)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-white/70 
                    hover:bg-white/10 transition-colors text-sm"
                >
                  Ver Detalhes
                </button>
              </div>
            </div>

            {role.isSystem && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <span className="text-white/40 text-xs flex items-center gap-1">
                  <Lock size={12} />
                  Papel do sistema (não editável)
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
          <Shield size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/60">Nenhum papel configurado</p>
          <button
            onClick={onCreateRole}
            className="mt-4 text-purple-400 hover:text-purple-300"
          >
            Criar primeiro papel
          </button>
        </div>
      )}
    </div>
  );
}

export const RoleManager = memo(RoleManagerInner);
