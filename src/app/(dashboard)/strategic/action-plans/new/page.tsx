"use client";

/**
 * Página: Novo Plano de Ação 5W2H
 * Wizard interativo para criação de planos de ação
 * 
 * @module app/(dashboard)/strategic/action-plans/new
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { FiveW2HWizard, type FiveW2HFormData } from '@/components/strategic/FiveW2HWizard';
import { RippleButton } from '@/components/ui/ripple-button';

interface OptionsData {
  objectives: Array<{ id: string; description: string }>;
  users: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
}

export default function NewActionPlanPage() {
  const router = useRouter();
  const [options, setOptions] = useState<OptionsData | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch('/api/strategic/action-plans/options');
        if (response.ok) {
          const data = await response.json();
          setOptions(data);
        }
      } catch (error) {
        console.error('Erro ao carregar opções:', error);
      } finally {
        setOptionsLoading(false);
      }
    };
    fetchOptions();
  }, []);

  const handleSubmit = async (formData: FiveW2HFormData) => {
    const response = await fetch('/api/strategic/action-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        what: formData.what,
        why: formData.why,
        where: formData.where,
        whenStart: formData.startDate,
        whenEnd: formData.endDate,
        who: formData.who[0], // Primeiro responsável como principal
        how: formData.how,
        howMuch: formData.howMuch,
        priority: formData.priority,
        strategicGoalId: formData.linkedObjective,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao criar plano');
    }
    
    const result = await response.json();
    router.push(`/strategic/action-plans/${result.id}`);
  };

  const handleCancel = () => {
    router.push('/strategic/action-plans');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <RippleButton 
            variant="ghost" 
            onClick={() => router.push('/strategic/action-plans')}
          >
            <ArrowLeft className="w-4 h-4" />
          </RippleButton>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="text-purple-400" />
              Novo Plano de Ação 5W2H
            </h1>
            <p className="text-white/60 mt-1">
              Preencha as etapas para criar um plano de ação completo
            </p>
          </div>
        </div>
      </motion.div>

      {/* Wizard ou Loading */}
      {optionsLoading ? (
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-white/60">Carregando opções...</p>
          </div>
        </div>
      ) : (
        <FiveW2HWizard
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          objectives={options?.objectives || []}
          users={options?.users || []}
          departments={options?.departments || []}
          branches={options?.branches || []}
        />
      )}
    </div>
  );
}
