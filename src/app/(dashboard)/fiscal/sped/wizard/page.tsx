'use client';

/**
 * SPED Generator Wizard Page
 * 
 * Fluxo guiado passo-a-passo para geração de SPED Fiscal, ECD e Contribuições.
 * Usa DDD Use Cases via API V2.
 */
import { useCallback } from 'react';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { GradientText } from '@/components/ui/magic-components';
import { SPEDGeneratorWizard } from '@/components/fiscal/SPEDGeneratorWizard';
import { FiscalAIWidget } from '@/components/fiscal';

const SPED_ENDPOINTS: Record<string, string> = {
  FISCAL: '/api/sped/fiscal/generate',
  ECD: '/api/sped/ecd/generate',
  CONTRIBUTIONS: '/api/sped/contributions/generate',
};

export default function SpedWizardPage() {
  const handleGenerate = useCallback(async (config: {
    type: string;
    year: number;
    month: number;
    includeZeroBalance: boolean;
    generateDigitalSignature: boolean;
    bookType: string;
  }) => {
    const endpoint = SPED_ENDPOINTS[config.type];
    if (!endpoint) {
      return { success: false, error: 'Tipo SPED inválido' };
    }

    const body = config.type === 'ECD'
      ? { year: config.year, bookType: config.bookType }
      : { month: config.month + 1, year: config.year }; // API expects 1-based month

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro na geração' }));
      return {
        success: false,
        error: errorData.error || `Erro HTTP ${response.status}`,
      };
    }

    // Response is a text file blob
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const monthStr = String(config.month + 1).padStart(2, '0');
    const fileName = `SPED_${config.type}_${monthStr}_${config.year}.txt`;

    return {
      success: true,
      fileName,
      downloadUrl: url,
      recordCount: Math.floor(blob.size / 80), // estimativa (~80 bytes por registro)
    };
  }, []);

  return (
    <>
      <PageTransition>
        <div className="p-8 space-y-6 max-w-4xl mx-auto">
          <FadeIn>
            <div className="text-center mb-8">
              <GradientText className="text-3xl font-bold mb-2">Gerador SPED</GradientText>
              <p className="text-gray-400">Wizard guiado para gerar obrigações acessórias fiscais</p>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <GlassmorphismCard className="p-6">
              <SPEDGeneratorWizard
                onGenerate={handleGenerate}
                organizationName="AuraCore ERP"
              />
            </GlassmorphismCard>
          </FadeIn>
        </div>
      </PageTransition>

      <FiscalAIWidget screen="sped-wizard" position="bottom-right" />
    </>
  );
}
