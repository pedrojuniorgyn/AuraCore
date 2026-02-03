'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { RippleButton } from '@/components/ui/ripple-button';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface PDCACycle {
  id: string;
  code: string;
  title: string;
  description: string;
  currentPhase: string;
  status: string;
  responsible: string;
  responsibleUserId: string | null;
  startDate: string | Date;
  endDate: string | Date;
  progress: number;
  effectiveness: number | null;
  isOverdue: boolean;
  daysUntilDue: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

const PHASE_OPTIONS = [
  { value: 'PLAN', label: 'Planejar' },
  { value: 'DO', label: 'Executar' },
  { value: 'CHECK', label: 'Verificar' },
  { value: 'ACT', label: 'Agir' },
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'PENDING', label: 'Planejado' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'BLOCKED', label: 'Bloqueado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

export default function PDCAEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<PDCACycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/strategic/pdca/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        setData(result.data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Error fetching PDCA Cycle:', error);
        toast.error('Erro ao carregar Ciclo PDCA', {
          description: message,
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!data) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/strategic/pdca/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar ciclo PDCA');
      }

      toast.success('Ciclo PDCA atualizado com sucesso');
      router.push(`/strategic/pdca/${id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao salvar', {
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof PDCACycle, value: string | number) => {
    if (!data) return;
    
    // Convert date strings (YYYY-MM-DD) to ISO datetime to preserve timezone
    let processedValue = value;
    if (typeof value === 'string' && (field === 'startDate' || field === 'endDate')) {
      // Parse as local date and convert to ISO string
      const date = new Date(value + 'T00:00:00');
      processedValue = date.toISOString();
    }
    
    setData({
      ...data,
      [field]: processedValue,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen -m-6 p-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen -m-6 p-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-600">Ciclo PDCA não encontrado</p>
            <Link href="/strategic/pdca">
              <RippleButton className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </RippleButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen -m-6 p-8 space-y-6">
      <PageHeader
        icon="✏️"
        title={`Editar Ciclo PDCA: ${data.code}`}
        description="Atualize as informações do ciclo PDCA"
        actions={
          <>
            <Link href={`/strategic/pdca/${id}`}>
              <RippleButton variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancelar
              </RippleButton>
            </Link>

            <RippleButton
              onClick={handleSubmit}
              disabled={saving}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </RippleButton>
          </>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Informações Gerais</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Código
              </label>
              <input
                type="text"
                value={data.code}
                onChange={(e) => handleChange('code', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Título *
              </label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Descrição
              </label>
              <textarea
                value={data.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Fase Atual *
                </label>
                <select
                  value={data.currentPhase}
                  onChange={(e) => handleChange('currentPhase', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {PHASE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Status *
                </label>
                <select
                  value={data.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Responsável
              </label>
              <input
                type="text"
                value={data.responsible}
                onChange={(e) => handleChange('responsible', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Data Início *
                </label>
                <input
                  type="date"
                  value={new Date(data.startDate).toISOString().split('T')[0]}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Data Fim *
                </label>
                <input
                  type="date"
                  value={new Date(data.endDate).toISOString().split('T')[0]}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Progresso (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={data.progress}
                  onChange={(e) => handleChange('progress', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {data.currentPhase === 'ACT' && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Efetividade (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={data.effectiveness || 0}
                    onChange={(e) => handleChange('effectiveness', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
