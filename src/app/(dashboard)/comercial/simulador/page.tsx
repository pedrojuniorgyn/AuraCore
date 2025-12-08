"use client";

import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { FreightSimulator } from "@/components/commercial/freight-simulator";

export default function FreightSimulatorPage() {
  return (
    <PageTransition>
      <div className="flex-1 space-y-6 p-8 pt-6 relative">
        {/* Background Pattern */}
        <GridPattern className="opacity-30" />

        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                <GradientText>Simulador de Frete</GradientText>
              </h1>
              <p className="text-muted-foreground mt-1">
                Calcule valores de frete em tempo real
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Simulador */}
        <FadeIn delay={0.2}>
          <FreightSimulator />
        </FadeIn>
      </div>
    </PageTransition>
  );
}

