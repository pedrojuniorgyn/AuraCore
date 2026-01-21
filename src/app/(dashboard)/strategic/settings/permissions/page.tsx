'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, LayoutGrid, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRoles } from '@/hooks/useRoles';
import {
  RoleManager,
  RoleEditor,
  PermissionMatrix,
  UserRoleAssignment,
} from '@/components/strategic/permissions';
import type { Role, Resource, Action } from '@/lib/permissions/permission-types';

type TabType = 'roles' | 'users' | 'matrix';

const tabs: { id: TabType; name: string; icon: React.ElementType }[] = [
  { id: 'roles', name: 'Papéis', icon: Shield },
  { id: 'users', name: 'Usuários', icon: Users },
  { id: 'matrix', name: 'Matriz', icon: LayoutGrid },
];

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('roles');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showNewRole, setShowNewRole] = useState(false);

  const {
    roles,
    users,
    isLoading,
    createRole,
    updateRole,
    deleteRole,
    assignRole,
    removeRole,
    searchUsers,
  } = useRoles();

  const handleCreateRole = async (roleData: Partial<Role>) => {
    try {
      await createRole(roleData);
      toast.success('Papel criado com sucesso!');
      setShowNewRole(false);
    } catch {
      toast.error('Erro ao criar papel');
    }
  };

  const handleUpdateRole = async (roleData: Partial<Role>) => {
    if (!editingRole) return;
    try {
      await updateRole(editingRole.id, roleData);
      toast.success('Papel atualizado!');
      setEditingRole(null);
    } catch {
      toast.error('Erro ao atualizar papel');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (role?.isSystem) {
      toast.error('Não é possível excluir papéis do sistema');
      return;
    }
    if (!confirm('Tem certeza que deseja excluir este papel?')) return;

    try {
      await deleteRole(roleId);
      toast.success('Papel excluído!');
    } catch {
      toast.error('Erro ao excluir papel');
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      await assignRole(userId, roleId);
      toast.success('Papel atribuído!');
    } catch {
      toast.error('Erro ao atribuir papel');
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      await removeRole(userId, roleId);
      toast.success('Papel removido!');
    } catch {
      toast.error('Erro ao remover papel');
    }
  };

  const handleTogglePermission = async (
    roleId: string,
    resource: Resource,
    action: Action,
    enabled: boolean
  ) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role || role.isSystem) return;

    const newPermissions = enabled
      ? [...role.permissions, { resource, action }]
      : role.permissions.filter((p) => !(p.resource === resource && p.action === action));

    try {
      await updateRole(roleId, { permissions: newPermissions });
      toast.success('Permissão atualizada!');
    } catch {
      toast.error('Erro ao atualizar permissão');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-8 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Shield className="text-purple-400" />
          Permissões e Papéis
        </h1>
        <p className="text-white/60 mt-1">
          Gerencie quem pode acessar e modificar dados do módulo Strategic
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all
                ${
                  activeTab === tab.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
            >
              <Icon size={18} />
              {tab.name}
              {activeTab === tab.id && (
                <span className="ml-2 text-xs opacity-70">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 rounded-2xl border border-white/10 p-6"
      >
        {activeTab === 'roles' && (
          <RoleManager
            roles={roles}
            onCreateRole={() => setShowNewRole(true)}
            onEditRole={setEditingRole}
            onDeleteRole={handleDeleteRole}
            onViewDetails={(role) => setEditingRole(role)}
          />
        )}

        {activeTab === 'users' && (
          <UserRoleAssignment
            users={users}
            roles={roles}
            onAssignRole={handleAssignRole}
            onRemoveRole={handleRemoveRole}
            onSearch={searchUsers}
          />
        )}

        {activeTab === 'matrix' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <LayoutGrid className="text-purple-400" size={24} />
              Matriz de Permissões
            </h2>
            <PermissionMatrix
              roles={roles}
              editable
              onTogglePermission={handleTogglePermission}
            />
          </div>
        )}
      </motion.div>

      {/* Role Editor Modal */}
      {(showNewRole || editingRole) && (
        <RoleEditor
          role={editingRole || undefined}
          onSave={editingRole ? handleUpdateRole : handleCreateRole}
          onClose={() => {
            setShowNewRole(false);
            setEditingRole(null);
          }}
        />
      )}
    </div>
  );
}
