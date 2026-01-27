'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { fetchAPI, APIResponseError } from '@/lib/api/fetch-client';

interface KpiDetail {
  id: string;
  code: string;
  name: string;
  description?: string;
  status?: string;
  unit?: string;
  targetValue?: number;
  currentValue?: number;
  baselineValue?: number;
  goalId?: string;
}

export default function KpiDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KpiDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!params?.id) {
        setError('Invalid KPI id');
        setKpi(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAPI<KpiDetail>(`/api/strategic/kpis/${params.id}`);
        setKpi(data);
      } catch (err) {
        if (err instanceof APIResponseError) {
          setError(err.data?.error ?? err.message);
        } else {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params?.id]);

  const goBack = () => router.push('/strategic/kpis');

  return (
    <div className="min-h-screen -m-6 p-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={goBack}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} className="text-white/70" />
        </button>
        <div>
          <p className="text-sm text-white/50">KPI</p>
          <h1 className="text-2xl font-semibold text-white">Detalhe do KPI</h1>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-white/70">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading KPI...</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && kpi && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Código</p>
              <p className="text-lg text-white font-semibold">{kpi.code}</p>
            </div>
            <div>
              <p className="text-sm text-white/50">Status</p>
              <p className="text-lg text-white font-semibold">{kpi.status ?? '—'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-white/50">Nome</p>
            <p className="text-lg text-white font-semibold">{kpi.name}</p>
          </div>
          {kpi.description && (
            <div>
              <p className="text-sm text-white/50">Descrição</p>
              <p className="text-white">{kpi.description}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-white/50">Target</p>
              <p className="text-white font-semibold">
                {kpi.targetValue ?? '—'} {kpi.unit ?? ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/50">Atual</p>
              <p className="text-white font-semibold">
                {kpi.currentValue ?? '—'} {kpi.unit ?? ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/50">Baseline</p>
              <p className="text-white font-semibold">
                {kpi.baselineValue ?? '—'} {kpi.unit ?? ''}
              </p>
            </div>
          </div>
          {kpi.goalId && (
            <div>
              <p className="text-sm text-white/50">Meta vinculada</p>
              <p className="text-white">{kpi.goalId}</p>
            </div>
          )}
        </div>
      )}

      {!loading && !error && !kpi && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-white/70">
          KPI not found.
        </div>
      )}
    </div>
  );
}
