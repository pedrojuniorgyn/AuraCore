'use client';

import { useEffect, useState } from 'react';
import type { IDetailCellRendererParams } from 'ag-grid-community';
import { Shield, AlertTriangle, Target, Zap } from 'lucide-react';

interface SwotItemDetail {
  id: string;
  description: string;
  detail: string;
  impact: number;
  probability: number;
  priority: number;
  category: string;
  status: string;
}

interface SwotItems {
  strengths: SwotItemDetail[];
  weaknesses: SwotItemDetail[];
  opportunities: SwotItemDetail[];
  threats: SwotItemDetail[];
}

export function SWOTDetailPanel(props: IDetailCellRendererParams) {
  const [items, setItems] = useState<SwotItems>({
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/strategic/swot/${props.data.id}/items`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const { items: data } = await response.json();
        setItems(data || { strengths: [], weaknesses: [], opportunities: [], threats: [] });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error('Error fetching SWOT items:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, [props.data.id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="mb-3 inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-sm text-gray-600">Carregando matriz SWOT...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-center">
          <p className="text-sm text-red-800">Erro ao carregar matriz: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900">
          Análise SWOT - {props.data.code}
        </h4>
        <p className="text-sm text-gray-600 mt-1">
          {props.data.title}
        </p>
      </div>

      {/* Matriz SWOT 2x2 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Quadrante Forças (F) - Verde */}
        <div className="rounded-lg border-2 border-green-500 bg-green-50 p-4 min-h-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-green-600" />
            <h5 className="font-semibold text-green-800">
              💪 Forças ({items.strengths.length})
            </h5>
          </div>
          <p className="text-xs text-green-700 mb-3 italic">Interno / Positivo</p>
          
          {items.strengths.length === 0 ? (
            <p className="text-sm text-green-600/60 italic">Nenhuma força identificada</p>
          ) : (
            <ul className="space-y-2">
              {items.strengths.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-600 font-bold mt-0.5">•</span>
                  <div className="flex-1">
                    <p className="font-medium">{item.description}</p>
                    {item.detail && (
                      <p className="text-xs text-gray-600 mt-1">{item.detail}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">
                        Prioridade: {item.priority.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quadrante Fraquezas (W) - Vermelho */}
        <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4 min-h-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h5 className="font-semibold text-red-800">
              ⚠️ Fraquezas ({items.weaknesses.length})
            </h5>
          </div>
          <p className="text-xs text-red-700 mb-3 italic">Interno / Negativo</p>
          
          {items.weaknesses.length === 0 ? (
            <p className="text-sm text-red-600/60 italic">Nenhuma fraqueza identificada</p>
          ) : (
            <ul className="space-y-2">
              {items.weaknesses.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-600 font-bold mt-0.5">•</span>
                  <div className="flex-1">
                    <p className="font-medium">{item.description}</p>
                    {item.detail && (
                      <p className="text-xs text-gray-600 mt-1">{item.detail}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">
                        Prioridade: {item.priority.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quadrante Oportunidades (O) - Azul */}
        <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-4 min-h-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-blue-600" />
            <h5 className="font-semibold text-blue-800">
              🚀 Oportunidades ({items.opportunities.length})
            </h5>
          </div>
          <p className="text-xs text-blue-700 mb-3 italic">Externo / Positivo</p>
          
          {items.opportunities.length === 0 ? (
            <p className="text-sm text-blue-600/60 italic">Nenhuma oportunidade identificada</p>
          ) : (
            <ul className="space-y-2">
              {items.opportunities.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <div className="flex-1">
                    <p className="font-medium">{item.description}</p>
                    {item.detail && (
                      <p className="text-xs text-gray-600 mt-1">{item.detail}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                        Prioridade: {item.priority.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quadrante Ameaças (T) - Amarelo/Laranja */}
        <div className="rounded-lg border-2 border-orange-500 bg-orange-50 p-4 min-h-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-orange-600" />
            <h5 className="font-semibold text-orange-800">
              ⚡ Ameaças ({items.threats.length})
            </h5>
          </div>
          <p className="text-xs text-orange-700 mb-3 italic">Externo / Negativo</p>
          
          {items.threats.length === 0 ? (
            <p className="text-sm text-orange-600/60 italic">Nenhuma ameaça identificada</p>
          ) : (
            <ul className="space-y-2">
              {items.threats.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-orange-600 font-bold mt-0.5">•</span>
                  <div className="flex-1">
                    <p className="font-medium">{item.description}</p>
                    {item.detail && (
                      <p className="text-xs text-gray-600 mt-1">{item.detail}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded">
                        Prioridade: {item.priority.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Info Footer */}
      <div className="mt-4 text-xs text-gray-500 flex items-center justify-between">
        <span>
          Total de itens: <strong className="text-gray-700">
            {items.strengths.length + items.weaknesses.length + 
             items.opportunities.length + items.threats.length}
          </strong>
        </span>
        <span className="text-gray-400">
          Prioridade calculada: Impacto × Probabilidade
        </span>
      </div>
    </div>
  );
}
