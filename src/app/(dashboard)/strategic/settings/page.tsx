"use client";

/**
 * Página: Configurações do Módulo Strategic
 * Personalização de aparência, thresholds, notificações e comportamento
 * 
 * @module app/(dashboard)/strategic/settings
 */
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, Palette, Target, Bell, Bot, Trophy, LayoutDashboard,
  Save, Loader2, RotateCcw, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsSection } from '@/components/strategic/SettingsSection';
import { SettingsItem } from '@/components/strategic/SettingsItem';
import { SettingsRadioGroup } from '@/components/strategic/SettingsRadioGroup';
import { ThresholdConfig } from '@/components/strategic/ThresholdConfig';
import { fetchAPI } from '@/lib/api';

interface StrategicSettings {
  appearance: {
    theme: 'dark' | 'light' | 'system';
    animations: boolean;
    density: 'compact' | 'comfortable' | 'spacious';
  };
  thresholds: {
    onTrack: number;
    atRisk: number;
  };
  notifications: {
    criticalAlerts: boolean;
    planDeadlines: boolean;
    deadlineDays: number;
    achievements: boolean;
    dailySummary: boolean;
    summaryTime: string;
    sound: boolean;
  };
  aurora: {
    autoInsights: boolean;
    detailLevel: 'summary' | 'detailed' | 'expert';
    language: string;
  };
  gamification: {
    enabled: boolean;
    publicRanking: boolean;
    weeklyChallenges: boolean;
  };
  warRoom: {
    autoRefresh: boolean;
    refreshInterval: number;
    defaultPage: string;
  };
}

const DEFAULT_SETTINGS: StrategicSettings = {
  appearance: { theme: 'dark', animations: true, density: 'comfortable' },
  thresholds: { onTrack: 80, atRisk: 50 },
  notifications: { 
    criticalAlerts: true, planDeadlines: true, deadlineDays: 3,
    achievements: true, dailySummary: false, summaryTime: '08:00', sound: true 
  },
  aurora: { autoInsights: true, detailLevel: 'detailed', language: 'pt-BR' },
  gamification: { enabled: true, publicRanking: true, weeklyChallenges: true },
  warRoom: { autoRefresh: true, refreshInterval: 30, defaultPage: 'war-room' },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<StrategicSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<StrategicSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAPI<{ settings: StrategicSettings }>('/api/strategic/settings');
      if (data.settings) {
        setSettings(data.settings);
        setOriginalSettings(data.settings);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = <K extends keyof StrategicSettings>(
    section: K,
    key: keyof StrategicSettings[K],
    value: StrategicSettings[K][keyof StrategicSettings[K]]
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const updateThresholds = (thresholds: StrategicSettings['thresholds']) => {
    setSettings(prev => ({ ...prev, thresholds }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetchAPI('/api/strategic/settings', {
        method: 'PUT',
        body: settings,
      });
      
      setOriginalSettings(settings);
      toast.success('Configurações salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    toast.info('Configurações restauradas para o padrão');
  };

  const handleCancel = () => {
    setSettings(originalSettings);
    toast.info('Alterações descartadas');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-white/60">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white/60">{error}</p>
          <button 
            onClick={fetchSettings}
            className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-xl"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="text-purple-400" />
            Configurações
          </h1>
          <p className="text-white/60 mt-1">
            Personalize o módulo estratégico
          </p>
        </div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 
              text-white flex items-center gap-2 hover:bg-white/20 transition-all"
          >
            <RotateCcw size={16} /> Restaurar Padrão
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-6 py-2 rounded-xl bg-purple-500 text-white 
              flex items-center gap-2 hover:bg-purple-600 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Salvar
          </motion.button>
        </div>
      </motion.div>

      <div className="grid gap-6 max-w-4xl">
        {/* Appearance */}
        <SettingsSection icon={<Palette size={20} />} title="Aparência">
          <SettingsItem label="Tema do Dashboard">
            <SettingsRadioGroup
              options={[
                { value: 'dark', label: 'Escuro (Aurora)' },
                { value: 'light', label: 'Claro' },
                { value: 'system', label: 'Sistema' },
              ]}
              value={settings.appearance.theme}
              onChange={(v) => updateSettings('appearance', 'theme', v as 'dark' | 'light' | 'system')}
            />
          </SettingsItem>

          <SettingsItem
            label="Animações"
            description="Exibir animações e transições suaves"
            toggle={{
              enabled: settings.appearance.animations,
              onChange: (v) => updateSettings('appearance', 'animations', v),
            }}
          />

          <SettingsItem label="Densidade">
            <SettingsRadioGroup
              options={[
                { value: 'compact', label: 'Compacto' },
                { value: 'comfortable', label: 'Confortável' },
                { value: 'spacious', label: 'Espaçoso' },
              ]}
              value={settings.appearance.density}
              onChange={(v) => updateSettings('appearance', 'density', v as 'compact' | 'comfortable' | 'spacious')}
            />
          </SettingsItem>
        </SettingsSection>

        {/* Thresholds */}
        <SettingsSection 
          icon={<Target size={20} />} 
          title="Thresholds de KPIs"
          description="Defina os limites para classificação de status"
        >
          <ThresholdConfig
            thresholds={settings.thresholds}
            onChange={updateThresholds}
          />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection icon={<Bell size={20} />} title="Notificações">
          <SettingsItem
            label="Alertas Críticos"
            description="Receber notificação quando KPI ficar crítico"
            toggle={{
              enabled: settings.notifications.criticalAlerts,
              onChange: (v) => updateSettings('notifications', 'criticalAlerts', v),
            }}
          />

          <SettingsItem
            label="Vencimento de Planos"
            description="Notificar dias antes do vencimento"
            toggle={{
              enabled: settings.notifications.planDeadlines,
              onChange: (v) => updateSettings('notifications', 'planDeadlines', v),
            }}
          >
            {settings.notifications.planDeadlines && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.notifications.deadlineDays}
                  onChange={(e) => updateSettings('notifications', 'deadlineDays', Number(e.target.value))}
                  className="w-16 px-3 py-2 rounded-lg bg-white/10 border border-white/10 
                    text-white text-center focus:outline-none focus:border-purple-500/50"
                />
                <span className="text-white/50">dias antes</span>
              </div>
            )}
          </SettingsItem>

          <SettingsItem
            label="Conquistas"
            description="Notificar ao desbloquear badges"
            toggle={{
              enabled: settings.notifications.achievements,
              onChange: (v) => updateSettings('notifications', 'achievements', v),
            }}
          />

          <SettingsItem
            label="Som de Notificação"
            description="Reproduzir som ao receber notificações"
            toggle={{
              enabled: settings.notifications.sound,
              onChange: (v) => updateSettings('notifications', 'sound', v),
            }}
          />
        </SettingsSection>

        {/* Aurora AI */}
        <SettingsSection icon={<Bot size={20} />} title="Aurora AI">
          <SettingsItem
            label="Insights Automáticos"
            description="Aurora analisa dados e sugere ações"
            toggle={{
              enabled: settings.aurora.autoInsights,
              onChange: (v) => updateSettings('aurora', 'autoInsights', v),
            }}
          />

          <SettingsItem label="Nível de Detalhe">
            <SettingsRadioGroup
              options={[
                { value: 'summary', label: 'Resumido' },
                { value: 'detailed', label: 'Detalhado' },
                { value: 'expert', label: 'Expert' },
              ]}
              value={settings.aurora.detailLevel}
              onChange={(v) => updateSettings('aurora', 'detailLevel', v as 'summary' | 'detailed' | 'expert')}
            />
          </SettingsItem>

          <SettingsItem label="Idioma das Respostas">
            <select
              value={settings.aurora.language}
              onChange={(e) => updateSettings('aurora', 'language', e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/10 
                text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es">Español</option>
            </select>
          </SettingsItem>
        </SettingsSection>

        {/* Gamification */}
        <SettingsSection icon={<Trophy size={20} />} title="Gamificação">
          <SettingsItem
            label="Sistema de Pontos"
            description="Habilitar XP, níveis e conquistas"
            toggle={{
              enabled: settings.gamification.enabled,
              onChange: (v) => updateSettings('gamification', 'enabled', v),
            }}
          />

          <SettingsItem
            label="Ranking Público"
            description="Aparecer no leaderboard da organização"
            toggle={{
              enabled: settings.gamification.publicRanking,
              onChange: (v) => updateSettings('gamification', 'publicRanking', v),
            }}
          />

          <SettingsItem
            label="Desafios Semanais"
            description="Participar de desafios automáticos"
            toggle={{
              enabled: settings.gamification.weeklyChallenges,
              onChange: (v) => updateSettings('gamification', 'weeklyChallenges', v),
            }}
          />
        </SettingsSection>

        {/* War Room */}
        <SettingsSection icon={<LayoutDashboard size={20} />} title="War Room">
          <SettingsItem
            label="Auto-refresh"
            description="Atualizar dados automaticamente"
            toggle={{
              enabled: settings.warRoom.autoRefresh,
              onChange: (v) => updateSettings('warRoom', 'autoRefresh', v),
            }}
          >
            {settings.warRoom.autoRefresh && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="120"
                  step="10"
                  value={settings.warRoom.refreshInterval}
                  onChange={(e) => updateSettings('warRoom', 'refreshInterval', Number(e.target.value))}
                  className="w-20 px-3 py-2 rounded-lg bg-white/10 border border-white/10 
                    text-white text-center focus:outline-none focus:border-purple-500/50"
                />
                <span className="text-white/50">segundos</span>
              </div>
            )}
          </SettingsItem>

          <SettingsItem label="Página Inicial">
            <select
              value={settings.warRoom.defaultPage}
              onChange={(e) => updateSettings('warRoom', 'defaultPage', e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/10 
                text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="war-room">War Room</option>
              <option value="dashboard">Dashboard</option>
              <option value="kpis">KPIs</option>
              <option value="action-plans">Planos de Ação</option>
            </select>
          </SettingsItem>
        </SettingsSection>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl
            bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-xl
            flex items-center gap-4 z-50"
        >
          <span className="text-yellow-300">⚠️ Você tem alterações não salvas</span>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-1.5 rounded-lg bg-white/10 text-white/70 
                hover:bg-white/20 transition-all"
            >
              Descartar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-yellow-500 text-yellow-900 font-medium
                hover:bg-yellow-400 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar agora'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
