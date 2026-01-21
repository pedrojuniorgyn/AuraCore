"use client";

import { useState } from "react";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { GradientText } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { Badge } from "@/components/ui/badge";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { FileText, FileSpreadsheet, BookOpen, Download, Calendar } from "lucide-react";
import { LegislationWidget, FiscalAIWidget } from "@/components/fiscal";

export default function CentralSpedPage() {
  const [generating, setGenerating] = useState(false);

  const generateSped = async (type: 'fiscal' | 'contributions' | 'ecd', month?: number, year?: number) => {
    setGenerating(true);
    try {
      const endpoint = type === 'fiscal' ? '/api/sped/fiscal/generate' :
                       type === 'contributions' ? '/api/sped/contributions/generate' :
                       '/api/sped/ecd/generate';
      
      const body = type === 'ecd' ? { year: year || 2024 } : { month: month || 12, year: year || 2024 };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SPED_${type.toUpperCase()}_${month || 12}_${year || 2024}.txt`;
        a.click();
        alert('✅ SPED gerado com sucesso!');
      } else {
        alert('❌ Erro ao gerar SPED');
      }
    } catch (error) {
      alert('❌ Erro ao gerar SPED');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
    <PageTransition>
      <div className="space-y-6">
        <FadeIn>
          <GradientText className="text-4xl font-bold mb-2">Central SPED</GradientText>
          <p className="text-gray-400">Geração de Obrigações Acessórias Fiscais</p>
        </FadeIn>

        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassmorphismCard className="aurora-purple-shadow hover:scale-105 transition-transform">
              <FileText className="w-12 h-12 mb-4 text-purple-400" />
              <GradientText className="text-2xl mb-2">SPED Fiscal</GradientText>
              <p className="text-gray-400 mb-4 text-sm">EFD-ICMS/IPI - Blocos 0, C, D, E, H</p>
              <Badge variant="success" className="mb-4">Última: 05/12/2024</Badge>
              <RippleButton onClick={() => generateSped('fiscal', 12, 2024)} className="w-full" disabled={generating}>
                <Download className="w-4 h-4 mr-2" />
                Gerar SPED Fiscal
              </RippleButton>
            </GlassmorphismCard>

            <GlassmorphismCard className="aurora-blue-shadow hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-12 h-12 mb-4 text-blue-400" />
              <GradientText className="text-2xl mb-2">SPED Contribuições</GradientText>
              <p className="text-gray-400 mb-4 text-sm">PIS/COFINS - Blocos 0, A, C, M</p>
              <Badge variant="success" className="mb-4">Última: 05/12/2024</Badge>
              <RippleButton onClick={() => generateSped('contributions', 12, 2024)} className="w-full" disabled={generating}>
                <Download className="w-4 h-4 mr-2" />
                Gerar SPED Contribuições
              </RippleButton>
            </GlassmorphismCard>

            <GlassmorphismCard className="aurora-green-shadow hover:scale-105 transition-transform">
              <BookOpen className="w-12 h-12 mb-4 text-green-400" />
              <GradientText className="text-2xl mb-2">ECD</GradientText>
              <p className="text-gray-400 mb-4 text-sm">Escrituração Contábil - Blocos 0, I, J, K</p>
              <Badge variant="warning" className="mb-4">Última: 28/11/2024</Badge>
              <RippleButton onClick={() => generateSped('ecd', undefined, 2024)} className="w-full" disabled={generating}>
                <Download className="w-4 h-4 mr-2" />
                Gerar ECD
              </RippleButton>
            </GlassmorphismCard>
          </div>
        </StaggerContainer>

        <FadeIn delay={0.2}>
          <GlassmorphismCard>
            <GradientText className="text-2xl mb-4">Configuração de Período</GradientText>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Mês</label>
                <select className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white">
                  <option value="12">Dezembro</option>
                  <option value="11">Novembro</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Ano</label>
                <select className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white">
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>
              <div className="flex items-end">
                <RippleButton className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  Aplicar Período
                </RippleButton>
              </div>
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>
    </PageTransition>

    {/* Widgets Flutuantes */}
    <div className="fixed bottom-6 right-6 z-50 space-y-4 w-96">
      {/* Widget de Legislação */}
      <LegislationWidget
        documentType="sped"
        title="Consulta Legislação SPED"
        defaultExpanded={false}
      />

      {/* Widget de Insights - usando wrapper padronizado */}
      <FiscalAIWidget screen="sped" />
    </div>
  </>
  );
}


