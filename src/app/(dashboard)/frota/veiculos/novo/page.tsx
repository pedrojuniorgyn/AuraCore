"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { SearchableSelect } from "@/components/ui/searchable-select";

export default function NovoVeiculoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    plate: "",
    type: "TRUCK",
    brand: "",
    model: "",
    year: new Date().getFullYear().toString(),
    chassisNumber: "",
    renavam: "",
    capacityKg: "",
    fuelType: "DIESEL",
    status: "AVAILABLE",
    currentKm: "0",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/fleet/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          year: parseInt(formData.year),
          capacityKg: parseFloat(formData.capacityKg),
          currentKm: parseInt(formData.currentKm),
          organizationId: 1, // TODO: Pegar do contexto
        }),
      });

      if (response.ok) {
        toast.success("Veículo cadastrado com sucesso!");
        router.push("/frota/veiculos");
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao cadastrar veículo");
      }
    } catch (error) {
      console.error("Erro ao cadastrar veículo:", error);
      toast.error("Erro ao cadastrar veículo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="p-8 space-y-6">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center gap-4 mb-6">
            <RippleButton
              onClick={() => router.back()}
              className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 px-3 py-3"
            >
              <ArrowLeft className="w-5 h-5" />
            </RippleButton>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent animate-gradient">
                🚛 Novo Veículo
              </h1>
              <p className="text-slate-400 mt-1">
                Cadastrar novo veículo na frota
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
          {/* Card Identificação */}
          <FadeIn delay={0.2}>
            <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all">
              <div className="p-6 space-y-6">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  📋 Identificação do Veículo
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Placa *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.plate}
                      onChange={(e) =>
                        setFormData({ ...formData, plate: e.target.value.toUpperCase() })
                      }
                      placeholder="ABC-1234"
                      maxLength={8}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-green-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-green-400/50 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Tipo de Veículo *
                    </label>
                    <SearchableSelect
                      options={[
                        { value: "TRUCK", label: "Caminhão" },
                        { value: "TRAILER", label: "Carreta" },
                        { value: "VAN", label: "Van" },
                        { value: "CAR", label: "Carro" },
                        { value: "MOTORCYCLE", label: "Motocicleta" },
                      ]}
                      value={formData.type}
                      onChange={(value) => setFormData({ ...formData, type: value })}
                      placeholder="Selecione o tipo"
                      borderColor="border-green-500/30"
                      focusColor="ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Status *
                    </label>
                    <SearchableSelect
                      options={[
                        { value: "AVAILABLE", label: "Disponível" },
                        { value: "IN_TRANSIT", label: "Em Viagem" },
                        { value: "MAINTENANCE", label: "Em Manutenção" },
                        { value: "INACTIVE", label: "Inativo" },
                      ]}
                      value={formData.status}
                      onChange={(value) => setFormData({ ...formData, status: value })}
                      placeholder="Selecione o status"
                      borderColor="border-green-500/30"
                      focusColor="ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Marca *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.brand}
                      onChange={(e) =>
                        setFormData({ ...formData, brand: e.target.value })
                      }
                      placeholder="Ex: Scania, Volvo, Mercedes"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-green-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-green-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                      placeholder="Ex: R440, FH 460"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-green-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-green-400/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Ano *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.year}
                      onChange={(e) =>
                        setFormData({ ...formData, year: e.target.value })
                      }
                      min="1950"
                      max={new Date().getFullYear() + 1}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-green-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white transition-all hover:border-green-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Chassi
                    </label>
                    <input
                      type="text"
                      value={formData.chassisNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, chassisNumber: e.target.value.toUpperCase() })
                      }
                      placeholder="17 caracteres"
                      maxLength={17}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-green-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-green-400/50 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      RENAVAM
                    </label>
                    <input
                      type="text"
                      value={formData.renavam}
                      onChange={(e) =>
                        setFormData({ ...formData, renavam: e.target.value })
                      }
                      placeholder="11 dígitos"
                      maxLength={11}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-green-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-green-400/50"
                    />
                  </div>
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Card Especificações */}
          <FadeIn delay={0.3}>
            <GlassmorphismCard className="border-emerald-500/30 hover:border-emerald-400/50 transition-all">
              <div className="p-6 space-y-6">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  ⚙️ Especificações Técnicas
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Capacidade (Kg) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.capacityKg}
                      onChange={(e) =>
                        setFormData({ ...formData, capacityKg: e.target.value })
                      }
                      placeholder="Ex: 25000"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-emerald-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-emerald-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Tipo de Combustível *
                    </label>
                    <SearchableSelect
                      options={[
                        { value: "DIESEL", label: "Diesel" },
                        { value: "GASOLINE", label: "Gasolina" },
                        { value: "ETHANOL", label: "Etanol" },
                        { value: "FLEX", label: "Flex" },
                        { value: "ELECTRIC", label: "Elétrico" },
                        { value: "HYBRID", label: "Híbrido" },
                      ]}
                      value={formData.fuelType}
                      onChange={(value) => setFormData({ ...formData, fuelType: value })}
                      placeholder="Selecione o combustível"
                      borderColor="border-emerald-500/30"
                      focusColor="ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Km Atual
                    </label>
                    <input
                      type="number"
                      value={formData.currentKm}
                      onChange={(e) =>
                        setFormData({ ...formData, currentKm: e.target.value })
                      }
                      placeholder="0"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-emerald-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-emerald-400/50"
                    />
                  </div>
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Card Observações */}
          <FadeIn delay={0.4}>
            <GlassmorphismCard className="border-teal-500/30 hover:border-teal-400/50 transition-all">
              <div className="p-6 space-y-4">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  📝 Observações
                </h2>

                <div>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Informações adicionais sobre o veículo..."
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-teal-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-teal-400/50 resize-none"
                  />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Botões */}
          <FadeIn delay={0.5}>
            <div className="flex gap-4 justify-end">
              <RippleButton
                type="button"
                onClick={() => router.back()}
                className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 px-6 py-3"
                disabled={isLoading}
              >
                Cancelar
              </RippleButton>
              <RippleButton
                type="submit"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 px-8 py-3"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Cadastrar Veículo
                  </>
                )}
              </RippleButton>
            </div>
          </FadeIn>
        </form>
      </div>
    </PageTransition>
  );
}




