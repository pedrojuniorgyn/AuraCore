'use client';

import { useState } from 'react';
import {
  Save,
  Undo2,
  Redo2,
  Trash2,
  Eye,
  Edit3,
  LayoutGrid,
  Share2,
} from 'lucide-react';
import { useDashboardBuilder } from '@/hooks/useDashboardBuilder';
import { dashboardService } from '@/lib/dashboard/dashboard-service';
import { WidgetLibrary } from './WidgetLibrary';
import { DashboardBuilderGrid } from './DashboardGrid';
import { WidgetConfigModal } from './WidgetConfig';
import { SaveLayoutModal } from './SaveLayoutModal';
import type { Widget, WidgetType, DashboardVisibility } from '@/lib/dashboard/dashboard-types';
import { toast } from 'sonner';

interface Props {
  dashboardId?: string;
  dashboardName?: string;
}

export function DashboardBuilder({ dashboardId, dashboardName = 'Novo Dashboard' }: Props) {
  const {
    widgets,
    selectedWidget,
    hasChanges,
    addWidget,
    removeWidget,
    updateWidget,
    moveWidget,
    duplicateWidget,
    selectWidget,
    clearLayout,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDashboardBuilder();

  const [isEditMode, setIsEditMode] = useState(true);
  const [configWidget, setConfigWidget] = useState<Widget | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [name, setName] = useState(dashboardName);

  const handleAddWidget = (type: WidgetType) => {
    addWidget(type);
  };

  const handleDropWidget = (type: WidgetType, position: { x: number; y: number }) => {
    addWidget(type, position);
  };

  const handleLayoutChange = (
    id: string,
    position: { x: number; y: number; w: number; h: number }
  ) => {
    moveWidget(id, position);
  };

  const handleToggleLock = (id: string) => {
    const widget = widgets.find((w) => w.id === id);
    if (widget) {
      updateWidget(id, { isLocked: !widget.isLocked });
    }
  };

  const handleSaveLayout = async (data: {
    name: string;
    description: string;
    visibility: DashboardVisibility;
    isDefault: boolean;
  }) => {
    try {
      if (dashboardId) {
        await dashboardService.updateDashboard(dashboardId, {
          name: data.name,
          description: data.description,
          visibility: data.visibility,
          isDefault: data.isDefault,
          widgets,
        });
      } else {
        await dashboardService.createDashboard({
          name: data.name,
          description: data.description,
          visibility: data.visibility,
          isDefault: data.isDefault,
          widgets,
          ownerId: 'current-user',
          ownerName: 'Você',
          organizationId: 1,
          branchId: 1,
        });
      }
      setName(data.name);
      toast.success('Dashboard salvo com sucesso!');
    } catch {
      toast.error('Erro ao salvar dashboard');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <LayoutGrid className="text-purple-400" size={20} />
          </div>
          <div>
            <h1 className="text-white font-semibold">{name}</h1>
            <p className="text-white/40 text-sm">
              {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
              {hasChanges && ' • Alterações não salvas'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 
              hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Desfazer"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 
              hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Refazer"
          >
            <Redo2 size={18} />
          </button>

          <div className="w-px h-6 bg-white/10 mx-2" />

          {/* Clear */}
          <button
            onClick={clearLayout}
            disabled={widgets.length === 0}
            className="p-2 rounded-lg hover:bg-red-500/20 text-white/60 
              hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Limpar tudo"
          >
            <Trash2 size={18} />
          </button>

          {/* View mode toggle */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
              ${isEditMode ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-white/60'}`}
          >
            {isEditMode ? <Edit3 size={16} /> : <Eye size={16} />}
            <span className="text-sm">{isEditMode ? 'Editando' : 'Visualizando'}</span>
          </button>

          <div className="w-px h-6 bg-white/10 mx-2" />

          {/* Share */}
          <button
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
            title="Compartilhar"
          >
            <Share2 size={18} />
          </button>

          {/* Save */}
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg 
              bg-purple-500 text-white hover:bg-purple-600 transition-colors"
          >
            <Save size={16} />
            <span>Salvar</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Widget Library */}
        {isEditMode && <WidgetLibrary onAddWidget={handleAddWidget} />}

        {/* Grid */}
        <DashboardBuilderGrid
          widgets={widgets}
          selectedWidget={selectedWidget}
          isEditMode={isEditMode}
          onSelectWidget={selectWidget}
          onRemoveWidget={removeWidget}
          onConfigureWidget={setConfigWidget}
          onDuplicateWidget={duplicateWidget}
          onToggleLock={handleToggleLock}
          onLayoutChange={handleLayoutChange}
          onDropWidget={handleDropWidget}
        />
      </div>

      {/* Widget Config Modal */}
      {configWidget && (
        <WidgetConfigModal
          widget={configWidget}
          isOpen={!!configWidget}
          onClose={() => setConfigWidget(null)}
          onSave={(updates) => {
            updateWidget(configWidget.id, updates);
            setConfigWidget(null);
          }}
        />
      )}

      {/* Save Modal */}
      <SaveLayoutModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveLayout}
        initialName={name}
        isNewDashboard={!dashboardId}
      />
    </div>
  );
}
