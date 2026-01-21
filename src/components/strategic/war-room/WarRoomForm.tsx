'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertTriangle, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { warRoomService } from '@/lib/war-room/war-room-service';
import type { WarRoomSeverity, EscalationLevel } from '@/lib/war-room/war-room-types';
import { SEVERITY_CONFIG, ESCALATION_LEVELS } from '@/lib/war-room/war-room-types';

export function WarRoomForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'high' as WarRoomSeverity,
    commanderId: 'current-user',
    commanderName: 'Você',
    currentEscalation: 'N1' as EscalationLevel,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      const warRoom = await warRoomService.createWarRoom({
        ...formData,
        status: 'active',
        startedAt: new Date(),
        linkedKpis: [],
        linkedActionPlans: [],
        teamMembers: [
          {
            userId: formData.commanderId,
            userName: formData.commanderName,
            role: 'commander',
            joinedAt: new Date(),
            isOnline: true,
          },
        ],
        actions: [],
        organizationId: 1,
        branchId: 1,
      });

      toast.success('War Room criada com sucesso!');
      router.push(`/strategic/war-room/${warRoom.id}`);
    } catch {
      toast.error('Erro ao criar War Room');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-white/60 text-sm mb-2">Título da Crise *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Crise OTD Região Sul"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 
              rounded-xl text-white placeholder:text-white/30
              focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-white/60 text-sm mb-2">Descrição</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descreva a situação de crise..."
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 
              rounded-xl text-white placeholder:text-white/30
              focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        {/* Severity */}
        <div>
          <label className="block text-white/60 text-sm mb-2">Severidade</label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(SEVERITY_CONFIG) as WarRoomSeverity[]).map((severity) => {
              const config = SEVERITY_CONFIG[severity];
              const isSelected = formData.severity === severity;

              return (
                <button
                  key={severity}
                  type="button"
                  onClick={() => setFormData({ ...formData, severity })}
                  className={`p-3 rounded-xl border transition-all text-center
                    ${isSelected ? `${config.bgColor} border-white/20` : 'border-white/10 hover:border-white/20'}`}
                >
                  <span className="text-xl block mb-1">{config.icon}</span>
                  <span className={`text-sm ${isSelected ? config.color : 'text-white/60'}`}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Initial Escalation */}
        <div>
          <label className="block text-white/60 text-sm mb-2">Nível de Escalação Inicial</label>
          <select
            value={formData.currentEscalation}
            onChange={(e) =>
              setFormData({ ...formData, currentEscalation: e.target.value as EscalationLevel })
            }
            className="w-full px-4 py-3 bg-white/5 border border-white/10 
              rounded-xl text-white focus:outline-none focus:border-purple-500"
          >
            {(Object.keys(ESCALATION_LEVELS) as EscalationLevel[]).map((level) => (
              <option key={level} value={level} className="bg-gray-900">
                {ESCALATION_LEVELS[level].label}
              </option>
            ))}
          </select>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Atenção</p>
            <p className="text-yellow-400/70 text-sm">
              Criar uma War Room irá notificar os membros da equipe e iniciar o processo de
              monitoramento intensivo.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 rounded-xl text-white/60 hover:text-white 
            hover:bg-white/5 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-3 rounded-xl 
            bg-red-500 text-white hover:bg-red-600 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          {isSubmitting ? 'Criando...' : 'Criar War Room'}
        </button>
      </div>
    </motion.form>
  );
}
