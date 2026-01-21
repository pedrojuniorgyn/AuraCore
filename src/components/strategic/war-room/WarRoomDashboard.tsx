'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, RefreshCw, Clock, Users, Zap } from 'lucide-react';
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WarRoom } from '@/lib/war-room/war-room-types';
import { SEVERITY_CONFIG, STATUS_CONFIG } from '@/lib/war-room/war-room-types';
import { CrisisIndicators } from './CrisisIndicators';
import { CrisisTimeline } from './CrisisTimeline';
import { ActionBoard } from './ActionBoard';
import { TeamPanel } from './TeamPanel';
import { EscalationPath } from './EscalationPath';

interface Props {
  warRoom: WarRoom;
  onRefresh: () => void;
  onCreateAction: () => void;
  onCompleteAction: (id: string) => void;
  onAddMember: () => void;
  onRemoveMember: (userId: string) => void;
  onEscalate: () => void;
  onAddUpdate: () => void;
}

export function WarRoomDashboard({
  warRoom,
  onRefresh,
  onCreateAction,
  onCompleteAction,
  onAddMember,
  onRemoveMember,
  onEscalate,
  onAddUpdate,
}: Props) {
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const severityConfig = SEVERITY_CONFIG[warRoom.severity];
  const statusConfig = STATUS_CONFIG[warRoom.status];

  const duration = differenceInSeconds(new Date(), new Date(warRoom.startedAt));
  const days = Math.floor(duration / 86400);
  const hours = Math.floor((duration % 86400) / 3600);
  const minutes = Math.floor((duration % 3600) / 60);

  const canEscalate = warRoom.currentEscalation !== 'DIR' && warRoom.status === 'active';

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-2xl border ${severityConfig.bgColor} border-white/10`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{severityConfig.icon}</span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{warRoom.title}</h1>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-lg 
                    ${severityConfig.bgColor} ${severityConfig.color}`}
                >
                  {severityConfig.label.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-white/60 text-sm">
                <span>Comandante: {warRoom.commanderName}</span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {days > 0 && `${days}d `}
                  {hours}h {minutes}m
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAlertsEnabled(!alertsEnabled)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl 
                transition-colors text-sm
                ${alertsEnabled ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}
            >
              {alertsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
              Alertas {alertsEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl hover:bg-white/10 text-white/60 
                hover:text-white transition-colors"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Indicators + Timeline */}
        <div className="col-span-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <CrisisIndicators kpis={warRoom.linkedKpis} />
            <EscalationPath
              currentLevel={warRoom.currentEscalation}
              nextEscalationAt={warRoom.nextEscalationAt}
              onEscalate={onEscalate}
              canEscalate={canEscalate}
            />
          </div>

          <CrisisTimeline
            updates={warRoom.updates}
            onAddUpdate={onAddUpdate}
            hasMore={warRoom.updates.length >= 10}
          />
        </div>

        {/* Right Column - Actions + Team */}
        <div className="col-span-4 space-y-6">
          <ActionBoard
            actions={warRoom.actions}
            onCreateAction={onCreateAction}
            onCompleteAction={onCompleteAction}
            onViewAll={() => {}}
          />
          <TeamPanel
            members={warRoom.teamMembers}
            onAddMember={onAddMember}
            onRemoveMember={onRemoveMember}
          />
        </div>
      </div>
    </div>
  );
}
