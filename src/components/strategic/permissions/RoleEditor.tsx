'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import type { Role, Permission, Resource, Action } from '@/lib/permissions/permission-types';
import {
  RESOURCE_LABELS,
  ACTION_LABELS,
  RESOURCE_ACTIONS,
} from '@/lib/permissions/permission-types';

interface RoleEditorProps {
  role?: Role;
  onSave: (role: Partial<Role>) => Promise<void>;
  onClose: () => void;
}

function RoleEditorInner({ role, onSave, onClose }: RoleEditorProps) {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [permissions, setPermissions] = useState<Permission[]>(role?.permissions || []);
  const [isSaving, setIsSaving] = useState(false);

  const hasPermission = (resource: Resource, action: Action): boolean => {
    return permissions.some((p) => p.resource === resource && p.action === action);
  };

  const togglePermission = (resource: Resource, action: Action) => {
    if (hasPermission(resource, action)) {
      setPermissions((prev) =>
        prev.filter((p) => !(p.resource === resource && p.action === action))
      );
    } else {
      setPermissions((prev) => [...prev, { resource, action }]);
    }
  };

  const toggleAllForResource = (resource: Resource) => {
    const resourceActions = RESOURCE_ACTIONS[resource];
    const allSelected = resourceActions.every((action) => hasPermission(resource, action));

    if (allSelected) {
      setPermissions((prev) => prev.filter((p) => p.resource !== resource));
    } else {
      const newPerms = resourceActions
        .filter((action) => !hasPermission(resource, action))
        .map((action) => ({ resource, action }));
      setPermissions((prev) => [...prev, ...newPerms]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        id: role?.id,
        name,
        description,
        permissions,
        isSystem: false,
        isDefault: false,
        priority: 50,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {role ? `Editar Papel: ${role.name}` : 'Novo Papel'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Gestor de KPIs"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white placeholder:text-white/30
                focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Responsável por gerenciar KPIs"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white placeholder:text-white/30
                focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Permissions */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Permissões</label>
            <div className="space-y-4 p-4 bg-white/5 rounded-xl">
              {(Object.keys(RESOURCE_ACTIONS) as Resource[]).map((resource) => (
                <div key={resource} className="border-b border-white/5 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{RESOURCE_LABELS[resource]}</span>
                    <button
                      onClick={() => toggleAllForResource(resource)}
                      className="text-purple-400 text-xs hover:text-purple-300"
                    >
                      {RESOURCE_ACTIONS[resource].every((a) => hasPermission(resource, a))
                        ? 'Desmarcar todos'
                        : 'Marcar todos'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {RESOURCE_ACTIONS[resource].map((action) => (
                      <label
                        key={`${resource}-${action}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={hasPermission(resource, action)}
                          onChange={() => togglePermission(resource, action)}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 
                            text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-white/80 text-sm">{ACTION_LABELS[action]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 text-white/70 
              hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!name || permissions.length === 0 || isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white 
              hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export const RoleEditor = memo(RoleEditorInner);
