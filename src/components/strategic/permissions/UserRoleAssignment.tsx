'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Plus, Users } from 'lucide-react';
import type { Role, UserWithRoles } from '@/lib/permissions/permission-types';

interface UserRoleAssignmentProps {
  users: UserWithRoles[];
  roles: Role[];
  onAssignRole: (userId: string, roleId: string) => Promise<void>;
  onRemoveRole: (userId: string, roleId: string) => Promise<void>;
  onSearch: (query: string) => void;
}

function UserRoleAssignmentInner({
  users,
  roles,
  onAssignRole,
  onRemoveRole,
  onSearch,
}: UserRoleAssignmentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningUser, setAssigningUser] = useState<string | null>(null);
  const [showRoleMenu, setShowRoleMenu] = useState<string | null>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    setAssigningUser(userId);
    try {
      await onAssignRole(userId, roleId);
    } finally {
      setAssigningUser(null);
      setShowRoleMenu(null);
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    await onRemoveRole(userId, roleId);
  };

  const getAvailableRoles = (user: UserWithRoles) => {
    return roles.filter((role) => !user.roles.some((r) => r.id === role.id));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="text-purple-400" size={24} />
          Atribuir Papéis aos Usuários
        </h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Buscar usuário..."
          className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 
            rounded-xl text-white placeholder:text-white/30
            focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {users.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="p-4 rounded-2xl bg-white/5 border border-white/10"
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                flex items-center justify-center text-white font-bold"
              >
                {user.initials}
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h3 className="text-white font-medium">{user.name}</h3>
                <p className="text-white/50 text-sm">{user.email}</p>
              </div>
            </div>

            {/* Roles */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-white/40 text-sm mr-2">Papéis:</span>

              {user.roles.map((role) => (
                <span
                  key={role.id}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full 
                    bg-purple-500/20 text-purple-300 text-sm"
                >
                  {role.name}
                  <button
                    onClick={() => handleRemoveRole(user.id, role.id)}
                    className="ml-1 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}

              {/* Add Role Button */}
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu(showRoleMenu === user.id ? null : user.id)}
                  disabled={getAvailableRoles(user).length === 0 || assigningUser === user.id}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full 
                    bg-white/10 text-white/60 text-sm hover:bg-white/20 
                    disabled:opacity-50 transition-colors"
                >
                  <Plus size={14} />
                </button>

                {/* Role Menu */}
                {showRoleMenu === user.id && getAvailableRoles(user).length > 0 && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowRoleMenu(null)}
                    />
                    <div
                      className="absolute left-0 top-full mt-1 w-48 rounded-xl 
                      bg-gray-800 border border-white/10 shadow-xl z-50 overflow-hidden"
                    >
                      {getAvailableRoles(user).map((role) => (
                        <button
                          key={role.id}
                          onClick={() => handleAssignRole(user.id, role.id)}
                          className="w-full px-4 py-2 text-left text-sm text-white 
                            hover:bg-purple-500/20 transition-colors"
                        >
                          {role.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {user.roles.length === 0 && (
                <span className="text-white/30 text-sm italic">Nenhum papel atribuído</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
          <Users size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/60">
            {searchQuery ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
          </p>
        </div>
      )}
    </div>
  );
}

export const UserRoleAssignment = memo(UserRoleAssignmentInner);
