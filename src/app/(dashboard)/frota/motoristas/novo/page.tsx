"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { SearchableSelect } from "@/components/ui/searchable-select";

export default function NovoMotoristaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    document: "",
    licenseNumber: "",
    licenseCategory: "D",
    licenseExpiry: "",
    phone: "",
    email: "",
    hireDate: new Date().toISOString().split("T")[0],
    status: "ACTIVE",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/fleet/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          organizationId: 1, // TODO: Pegar do contexto
        }),
      });

      if (response.ok) {
        toast.success("Motorista cadastrado com sucesso!");
        router.push("/frota/motoristas");
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao cadastrar motorista");
      }
    } catch (error) {
      console.error("Erro ao cadastrar motorista:", error);
      toast.error("Erro ao cadastrar motorista");
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent animate-gradient">
                👤 Novo Motorista
              </h1>
              <p className="text-slate-400 mt-1">
                Cadastrar novo motorista na frota
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
          {/* Card Dados Pessoais */}
          <FadeIn delay={0.2}>
            <GlassmorphismCard className="border-blue-500/30 hover:border-blue-400/50 transition-all">
              <div className="p-6 space-y-6">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  📋 Dados Pessoais
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Nome completo do motorista"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-blue-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-blue-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      CPF *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.document}
                      onChange={(e) =>
                        setFormData({ ...formData, document: e.target.value })
                      }
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-blue-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-blue-400/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Telefone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="(00) 00000-0000"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-blue-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-blue-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="email@exemplo.com"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-blue-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-blue-400/50"
                    />
                  </div>
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Card CNH */}
          <FadeIn delay={0.3}>
            <GlassmorphismCard className="border-cyan-500/30 hover:border-cyan-400/50 transition-all">
              <div className="p-6 space-y-6">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent">
                  🪪 Carteira de Habilitação (CNH)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Número da CNH *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.licenseNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, licenseNumber: e.target.value })
                      }
                      placeholder="00000000000"
                      maxLength={11}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-cyan-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-cyan-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Categoria *
                    </label>
                    <SearchableSelect
                      options={[
                        { value: "A", label: "A - Motos" },
                        { value: "B", label: "B - Carros" },
                        { value: "C", label: "C - Caminhões Pequenos" },
                        { value: "D", label: "D - Ônibus/Caminhões" },
                        { value: "E", label: "E - Articulados" },
                        { value: "AB", label: "AB - A + B" },
                        { value: "AC", label: "AC - A + C" },
                        { value: "AD", label: "AD - A + D" },
                        { value: "AE", label: "AE - A + E" },
                      ]}
                      value={formData.licenseCategory}
                      onChange={(value) => setFormData({ ...formData, licenseCategory: value })}
                      placeholder="Categoria"
                      borderColor="border-cyan-500/30"
                      focusColor="ring-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Validade *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.licenseExpiry}
                      onChange={(e) =>
                        setFormData({ ...formData, licenseExpiry: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-gray-900/50 border border-cyan-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white transition-all hover:border-cyan-400/50"
                    />
                  </div>
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Card Contratação */}
          <FadeIn delay={0.4}>
            <GlassmorphismCard className="border-sky-500/30 hover:border-sky-400/50 transition-all">
              <div className="p-6 space-y-6">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
                  💼 Informações de Contratação
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Data de Contratação *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.hireDate}
                      onChange={(e) =>
                        setFormData({ ...formData, hireDate: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-gray-900/50 border border-sky-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-white transition-all hover:border-sky-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Status *
                    </label>
                    <SearchableSelect
                      options={[
                        { value: "ACTIVE", label: "Ativo" },
                        { value: "INACTIVE", label: "Inativo" },
                        { value: "ON_LEAVE", label: "Afastado" },
                        { value: "SUSPENDED", label: "Suspenso" },
                      ]}
                      value={formData.status}
                      onChange={(value) => setFormData({ ...formData, status: value })}
                      placeholder="Status"
                      borderColor="border-sky-500/30"
                      focusColor="ring-sky-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Informações adicionais sobre o motorista..."
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-sky-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-sky-400/50 resize-none"
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
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-8 py-3"
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
                    Cadastrar Motorista
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







