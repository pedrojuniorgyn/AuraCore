'use client';

import { motion } from 'framer-motion';

interface Props {
  config: {
    name: string;
    type: string;
    sections: string[];
  };
}

const sectionLabels: Record<string, string> = {
  summary: 'RESUMO EXECUTIVO',
  healthScore: 'HEALTH SCORE',
  perspectives: 'PERSPECTIVAS BSC',
  topActions: 'TOP 5 AÇÕES PRIORITÁRIAS',
  criticalKpis: 'KPIs CRÍTICOS',
  pdcaCycles: 'CICLOS PDCA',
  swotAnalysis: 'ANÁLISE SWOT',
  achievements: 'CONQUISTAS',
};

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function ReportPreview({ config }: Props) {
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold">Preview do Relatório</h3>
          <p className="text-white/50 text-sm">Visualização aproximada do PDF</p>
        </div>
        <div className="flex items-center gap-4">
          <select className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/10">
            <option value="pdf">PDF</option>
            <option value="html">HTML</option>
          </select>
          <span className="text-white/50 text-sm">~{config.sections.length + 1} páginas</span>
        </div>
      </div>

      {/* PDF Preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-lg p-8 text-black max-h-96 overflow-y-auto shadow-xl"
      >
        {/* Header */}
        <div className="text-center border-b-2 border-purple-500 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-purple-700">{config.name || 'Relatório'}</h1>
          <p className="text-gray-500 mt-1">
            Semana {weekNumber} - {monthName}
          </p>
        </div>

        {/* Sections */}
        {config.sections.map((section) => (
          <div key={section} className="mb-6">
            <h2 className="text-lg font-bold text-purple-700 border-b border-gray-200 pb-2 mb-3">
              {sectionLabels[section] || section}
            </h2>
            
            {section === 'summary' && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-purple-600">72%</p>
                    <p className="text-gray-500 text-sm">Health Score</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">12/20</p>
                    <p className="text-gray-500 text-sm">KPIs no Prazo</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">3</p>
                    <p className="text-gray-500 text-sm">Ações Atrasadas</p>
                  </div>
                </div>
              </div>
            )}

            {section === 'perspectives' && (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { name: 'Financeiro', score: 75, colorClass: 'text-green-600' },
                  { name: 'Cliente', score: 82, colorClass: 'text-blue-600' },
                  { name: 'Processos', score: 68, colorClass: 'text-purple-600' },
                  { name: 'Aprendizado', score: 91, colorClass: 'text-orange-600' },
                ].map((p) => (
                  <div key={p.name} className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className={`text-xl font-bold ${p.colorClass}`}>{p.score}%</p>
                    <p className="text-gray-500 text-xs">{p.name}</p>
                  </div>
                ))}
              </div>
            )}

            {section === 'topActions' && (
              <div className="space-y-2">
                {[
                  { code: 'PDC-002', name: 'Reverter queda OTD', status: 'late' },
                  { code: 'PDC-005', name: 'Reduzir custos operacionais', status: 'risk' },
                  { code: 'PDC-008', name: 'Capacitar equipe entregas', status: 'ok' },
                ].map((action, i) => (
                  <div key={action.code} className="flex items-center gap-3 py-2 border-b border-gray-100">
                    <span className={`w-2 h-2 rounded-full ${
                      action.status === 'late' ? 'bg-red-500' :
                      action.status === 'risk' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <span className="text-gray-400 text-sm">{i + 1}.</span>
                    <span className="text-gray-600 text-sm font-mono">{action.code}</span>
                    <span className="text-gray-800 text-sm">{action.name}</span>
                  </div>
                ))}
              </div>
            )}

            {section === 'healthScore' && (
              <div className="flex items-center justify-center py-4">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full border-8 border-purple-500 flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold text-purple-600">72%</span>
                  </div>
                  <p className="text-gray-500 text-sm mt-2">↗ +3% vs semana anterior</p>
                </div>
              </div>
            )}

            {!['summary', 'perspectives', 'topActions', 'healthScore'].includes(section) && (
              <div className="h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                [Conteúdo de {sectionLabels[section]}]
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div className="text-center text-gray-400 text-xs pt-4 border-t border-gray-200 mt-6">
          Gerado automaticamente pelo AuraCore Strategic em {now.toLocaleDateString('pt-BR')}
        </div>
      </motion.div>
    </div>
  );
}
