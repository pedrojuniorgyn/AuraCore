'use client';

import { motion } from 'framer-motion';
import { Calendar, Users, Zap, BarChart3, Settings, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WarRoom } from '@/lib/war-room/war-room-types';
import { SEVERITY_CONFIG, STATUS_CONFIG } from '@/lib/war-room/war-room-types';

interface Props {
  warRoom: WarRoom;
  onEnter: () => void;
  onSettings?: () => void;
}

export function WarRoomCard({ warRoom, onEnter, onSettings }: Props) {
  const severityConfig = SEVERITY_CONFIG[warRoom.severity];
  const statusConfig = STATUS_CONFIG[warRoom.status];
  const activeActions = warRoom.actions.filter((a) => a.status !== 'completed').length;
  const onlineMembers = warRoom.teamMembers.filter((m) => m.isOnline).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-2xl border backdrop-blur-sm transition-all
        hover:border-white/20 cursor-pointer group
        ${severityConfig.bgColor} border-white/10`}
      onClick={onEnter}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{severityConfig.icon}</span>
          <div>
            <h3 className="text-white font-semibold">{warRoom.title}</h3>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full 
                ${statusConfig.bgColor} ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
          </div>
        </div>
        <span
          className={`text-xs font-bold px-2 py-1 rounded-lg 
            ${severityConfig.bgColor} ${severityConfig.color}`}
        >
          {severityConfig.label.toUpperCase()}
        </span>
      </div>

      {/* Description */}
      <p className="text-white/60 text-sm mb-4 line-clamp-2">{warRoom.description}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Calendar size={14} />
          <span>Iniciada {formatDistanceToNow(new Date(warRoom.startedAt), { locale: ptBR, addSuffix: true })}</span>
        </div>
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Users size={14} />
          <span>
            {onlineMembers}/{warRoom.teamMembers.length} membros
          </span>
        </div>
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Zap size={14} />
          <span>{activeActions} ações em andamento</span>
        </div>
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <BarChart3 size={14} />
          <span>{warRoom.linkedKpis.length} KPIs monitorados</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEnter();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg 
            bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 
            transition-colors text-sm font-medium"
        >
          Entrar na Sala
          <ArrowRight size={14} />
        </button>

        {onSettings && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSettings();
            }}
            className="p-2 rounded-lg hover:bg-white/10 text-white/40 
              hover:text-white transition-colors"
          >
            <Settings size={18} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
