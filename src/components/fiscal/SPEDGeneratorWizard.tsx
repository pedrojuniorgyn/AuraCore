'use client';

/**
 * SPEDGeneratorWizard - Wizard para gerar SPED Fiscal, ECD e Contribuições
 * 
 * Steps: 1. Tipo SPED  2. Período  3. Configurações  4. Gerar  5. Download
 */
import { useState, useCallback } from 'react';
import {
  FileSpreadsheet, Calendar, Settings, Play, Download,
  CheckCircle2, AlertCircle, Loader2, ArrowLeft, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

type SpedType = 'FISCAL' | 'ECD' | 'CONTRIBUTIONS';
type WizardStep = 1 | 2 | 3 | 4 | 5;

interface SpedConfig {
  type: SpedType;
  year: number;
  month: number;
  includeZeroBalance: boolean;
  generateDigitalSignature: boolean;
  bookType: string;
}

interface GenerationResult {
  success: boolean;
  fileName?: string;
  downloadUrl?: string;
  recordCount?: number;
  warnings?: string[];
  error?: string;
}

interface SPEDGeneratorWizardProps {
  onGenerate: (config: SpedConfig) => Promise<GenerationResult>;
  organizationName: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SPED_TYPES: { id: SpedType; name: string; description: string; icon: string }[] = [
  {
    id: 'FISCAL',
    name: 'SPED Fiscal (EFD-ICMS/IPI)',
    description: 'Escrituração Fiscal Digital de ICMS e IPI',
    icon: '📊',
  },
  {
    id: 'ECD',
    name: 'SPED ECD (Contábil)',
    description: 'Escrituração Contábil Digital',
    icon: '📒',
  },
  {
    id: 'CONTRIBUTIONS',
    name: 'EFD-Contribuições (PIS/COFINS)',
    description: 'Escrituração de PIS e COFINS',
    icon: '📋',
  },
];

const STEPS: { step: WizardStep; title: string; icon: React.ReactNode }[] = [
  { step: 1, title: 'Tipo', icon: <FileSpreadsheet className="h-4 w-4" /> },
  { step: 2, title: 'Período', icon: <Calendar className="h-4 w-4" /> },
  { step: 3, title: 'Configurações', icon: <Settings className="h-4 w-4" /> },
  { step: 4, title: 'Gerar', icon: <Play className="h-4 w-4" /> },
  { step: 5, title: 'Download', icon: <Download className="h-4 w-4" /> },
];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ============================================================================
// COMPONENT
// ============================================================================

export function SPEDGeneratorWizard({ onGenerate, organizationName }: SPEDGeneratorWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [config, setConfig] = useState<SpedConfig>({
    type: 'FISCAL',
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0-based (previous month)
    includeZeroBalance: false,
    generateDigitalSignature: true,
    bookType: 'G',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const canGoNext = useCallback(() => {
    switch (step) {
      case 1: return !!config.type;
      case 2: return config.year > 2020 && config.month >= 0 && config.month <= 11;
      case 3: return true;
      case 4: return result?.success === true;
      default: return false;
    }
  }, [step, config, result]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setResult(null);
    try {
      const res = await onGenerate(config);
      setResult(res);
      if (res.success) {
        setStep(5);
      }
    } catch (err: unknown) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [config, onGenerate]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Progress */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, idx) => (
          <div key={s.step} className="flex items-center">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              step >= s.step
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-gray-800/50 text-gray-500 border border-white/5'
            )}>
              {step > s.step ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                s.icon
              )}
              <span className="hidden sm:inline">{s.title}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn(
                'w-8 h-px mx-1',
                step > s.step ? 'bg-purple-500/50' : 'bg-gray-700'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        {/* Step 1: Tipo SPED */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Selecione o tipo de SPED</h3>
            <p className="text-sm text-gray-400">Escolha qual obrigação acessória deseja gerar.</p>
            <div className="space-y-3 mt-4">
              {SPED_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setConfig(prev => ({ ...prev, type: t.id }))}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left',
                    config.type === t.id
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-white/10 bg-gray-800/30 hover:border-white/20'
                  )}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Período */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Selecione o período</h3>
            <p className="text-sm text-gray-400">
              {organizationName} - {SPED_TYPES.find(t => t.id === config.type)?.name}
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Ano</label>
                <select
                  value={config.year}
                  onChange={e => setConfig(prev => ({ ...prev, year: Number(e.target.value) }))}
                  className="w-full bg-gray-700/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Mês</label>
                <select
                  value={config.month}
                  onChange={e => setConfig(prev => ({ ...prev, month: Number(e.target.value) }))}
                  className="w-full bg-gray-700/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {MONTHS.map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Configurações */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Configurações</h3>
            <p className="text-sm text-gray-400">Ajuste as opções de geração do SPED.</p>
            <div className="space-y-3 mt-4">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:border-white/20">
                <input
                  type="checkbox"
                  checked={config.includeZeroBalance}
                  onChange={e => setConfig(prev => ({ ...prev, includeZeroBalance: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                <div>
                  <p className="text-sm text-white">Incluir contas com saldo zero</p>
                  <p className="text-xs text-gray-400">Gerar registros mesmo para contas sem movimentação</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:border-white/20">
                <input
                  type="checkbox"
                  checked={config.generateDigitalSignature}
                  onChange={e => setConfig(prev => ({ ...prev, generateDigitalSignature: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                <div>
                  <p className="text-sm text-white">Assinatura digital</p>
                  <p className="text-xs text-gray-400">Assinar arquivo com certificado digital A1</p>
                </div>
              </label>
              {config.type === 'ECD' && (
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Tipo do Livro</label>
                  <select
                    value={config.bookType}
                    onChange={e => setConfig(prev => ({ ...prev, bookType: e.target.value }))}
                    className="w-full bg-gray-700/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="G">G - Diário Geral</option>
                    <option value="R">R - Diário com Escrituração Resumida</option>
                    <option value="A">A - Diário Auxiliar</option>
                    <option value="Z">Z - Razão Auxiliar</option>
                    <option value="B">B - Balancetes Diários e Balanços</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Gerar */}
        {step === 4 && (
          <div className="space-y-4 text-center">
            <h3 className="text-lg font-semibold text-white">Gerar SPED</h3>
            <div className="bg-gray-900/50 rounded-lg p-4 text-sm text-left space-y-2">
              <p className="text-gray-400">
                <span className="text-gray-300 font-medium">Tipo:</span>{' '}
                {SPED_TYPES.find(t => t.id === config.type)?.name}
              </p>
              <p className="text-gray-400">
                <span className="text-gray-300 font-medium">Período:</span>{' '}
                {MONTHS[config.month]} / {config.year}
              </p>
              <p className="text-gray-400">
                <span className="text-gray-300 font-medium">Empresa:</span>{' '}
                {organizationName}
              </p>
            </div>

            {!isGenerating && !result && (
              <button
                onClick={handleGenerate}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
              >
                <Play className="h-4 w-4 inline mr-2" />
                Gerar Arquivo SPED
              </button>
            )}

            {isGenerating && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                <p className="text-sm text-gray-400">Gerando arquivo SPED...</p>
                <p className="text-xs text-gray-500">Isso pode levar alguns minutos</p>
              </div>
            )}

            {result && !result.success && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">Erro na geração</span>
                </div>
                <p className="text-sm text-red-300">{result.error}</p>
                <button
                  onClick={handleGenerate}
                  className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Download */}
        {step === 5 && result?.success && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
            <h3 className="text-lg font-semibold text-white">SPED Gerado com Sucesso!</h3>
            <div className="bg-gray-900/50 rounded-lg p-4 text-sm text-left space-y-2">
              <p className="text-gray-400">
                <span className="text-gray-300 font-medium">Arquivo:</span>{' '}
                {result.fileName}
              </p>
              {result.recordCount !== undefined && (
                <p className="text-gray-400">
                  <span className="text-gray-300 font-medium">Registros:</span>{' '}
                  {result.recordCount.toLocaleString('pt-BR')}
                </p>
              )}
            </div>

            {result.warnings && result.warnings.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-left">
                <p className="text-xs font-medium text-yellow-400 mb-1">Avisos:</p>
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-300">- {w}</p>
                ))}
              </div>
            )}

            {result.downloadUrl && (
              <a
                href={result.downloadUrl}
                download={result.fileName}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Baixar Arquivo
              </a>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setStep(prev => (prev > 1 ? (prev - 1) as WizardStep : prev))}
          disabled={step === 1}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors',
            step === 1
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-300 hover:bg-gray-800'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </button>
        {step < 4 && (
          <button
            onClick={() => setStep(prev => (canGoNext() ? (prev + 1) as WizardStep : prev))}
            disabled={!canGoNext()}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors',
              canGoNext()
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            )}
          >
            Próximo
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
