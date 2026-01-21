'use client';

import { motion } from 'framer-motion';
import { Crown, UserPlus, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TeamMember } from '@/lib/war-room/war-room-types';

interface Props {
  members: TeamMember[];
  onAddMember: () => void;
  onRemoveMember?: (userId: string) => void;
}

export function TeamPanel({ members, onAddMember, onRemoveMember }: Props) {
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === 'commander') return -1;
    if (b.role === 'commander') return 1;
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return 0;
  });

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Equipe ({members.length})</h3>
        <button
          onClick={onAddMember}
          className="flex items-center gap-1 text-sm text-purple-400 
            hover:text-purple-300 transition-colors"
        >
          <UserPlus size={16} />
          Adicionar
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedMembers.map((member, index) => (
          <motion.div
            key={member.userId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 group"
          >
            {/* Avatar */}
            <div className="relative">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center
                  ${member.role === 'commander' ? 'bg-yellow-500/20' : 'bg-purple-500/20'}`}
              >
                {member.userAvatar ? (
                  <img
                    src={member.userAvatar}
                    alt={member.userName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium">
                    {member.userName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </span>
                )}
              </div>
              {/* Online indicator */}
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900
                  ${member.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {member.role === 'commander' && (
                  <Crown size={14} className="text-yellow-400" />
                )}
                <span className="text-white/80 text-sm font-medium truncate">
                  {member.userName}
                </span>
              </div>
              <span className="text-white/40 text-xs">
                {member.isOnline
                  ? 'Online agora'
                  : member.lastSeenAt
                    ? `Offline há ${formatDistanceToNow(new Date(member.lastSeenAt), { locale: ptBR })}`
                    : 'Offline'}
              </span>
            </div>

            {/* Actions */}
            {onRemoveMember && member.role !== 'commander' && (
              <button
                onClick={() => onRemoveMember(member.userId)}
                className="p-1 rounded hover:bg-white/10 text-white/40 
                  hover:text-white/70 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal size={16} />
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center py-6 text-white/40">
          <p className="text-sm">Nenhum membro na equipe</p>
        </div>
      )}
    </div>
  );
}
