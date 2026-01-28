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
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';

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
        const data = await fetchAPI<OptionsData>('/api/strategic/action-plans/options');
        setOptions(data);
      } catch (error) {
        console.error('Failed to load options:', error);
      } finally {
        setOptionsLoading(false);
      }
    };
    fetchOptions();
  }, []);

  const handleSubmit = async (formData: FiveW2HFormData) => {
    const whoId = formData.who[0];
    const whoUser = options?.users.find(u => u.id === whoId);
    
    try {
      const result = await fetchAPI<{ id: string }>('/api/strategic/action-plans', {
        method: 'POST',
        body: {
          what: formData.what,
          why: formData.why,
          whereLocation: formData.where, // API espera whereLocation, form tem where
          whenStart: formData.startDate,
          whenEnd: formData.endDate,
          who: whoUser ? whoUser.name : 'Owner',
          whoUserId: whoId,
          how: formData.how,
          howMuchAmount: formData.howMuch,
          howMuchCurrency: 'BRL', // Default currency
          priority: formData.priority,
          goalId: formData.linkedObjective, // API espera goalId, form tem linkedObjective
        },
      });
      
      toast.success('Action plan created successfully!');
      router.push(`/strategic/action-plans/${result.id}`);
    } catch (error) {
      console.error('Failed to create action plan:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create action plan');
    }
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
