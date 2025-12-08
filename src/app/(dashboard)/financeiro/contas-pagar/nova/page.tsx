"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface CostCenter {
  id: number;
  code: string;
  name: string;
}

interface ChartAccount {
  id: number;
  code: string;
  name: string;
  requiresCostCenter: boolean;
}

export default function NovaContaPagarPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);

  const [formData, setFormData] = useState({
    partnerId: "",
    categoryId: "",
    costCenterId: "",
    chartAccountId: "",
    description: "",
    documentNumber: "",
    issueDate: "",
    dueDate: "",
    amount: "",
    notes: "",
  });

  useEffect(() => {
    // Carregar centros de custo analíticos
    fetch("/api/financial/cost-centers/analytical")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCostCenters(data.data);
        }
      })
      .catch((err) => console.error("Erro ao carregar centros de custo:", err));

    // Carregar contas analíticas
    fetch("/api/financial/chart-accounts/analytical")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setChartAccounts(data.data);
        }
      })
      .catch((err) => console.error("Erro ao carregar contas:", err));
  }, []);

  // Verificar se a conta selecionada exige centro de custo
  const selectedAccount = chartAccounts.find(
    (acc) => acc.id === parseInt(formData.chartAccountId)
  );
  const requiresCostCenter = selectedAccount?.requiresCostCenter || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar centro de custo obrigatório
    if (requiresCostCenter && !formData.costCenterId) {
      toast.error("Esta conta exige a seleção de um Centro de Custo!");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/financial/payables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: formData.partnerId ? parseInt(formData.partnerId) : null,
          categoryId: parseInt(formData.categoryId),
          costCenterId: formData.costCenterId
            ? parseInt(formData.costCenterId)
            : null,
          chartAccountId: formData.chartAccountId
            ? parseInt(formData.chartAccountId)
            : null,
          description: formData.description,
          documentNumber: formData.documentNumber,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          amount: parseFloat(formData.amount),
          notes: formData.notes,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Conta a pagar criada com sucesso!");
        router.push("/financeiro/contas-pagar");
      } else {
        toast.error(result.error || "Erro ao criar conta");
      }
    } catch (error) {
      console.error("Erro ao criar conta:", error);
      toast.error("Erro ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <GridPattern />

      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <GradientText className="text-3xl font-bold mb-2">
              Nova Conta a Pagar
            </GradientText>
            <p className="text-sm text-muted-foreground">
              Preencha os dados da nova conta
            </p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle>Dados da Conta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Descrição *</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label>Número do Documento</Label>
                  <Input
                    value={formData.documentNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        documentNumber: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Emissão *</Label>
                  <Input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, issueDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label>Data de Vencimento *</Label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label>Categoria *</Label>
                  <Input
                    type="number"
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    placeholder="ID da categoria"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>
                    Conta Contábil *
                    {requiresCostCenter && (
                      <span className="ml-2 text-xs text-red-600 font-semibold">
                        (Exige CC)
                      </span>
                    )}
                  </Label>
                  <Select
                    value={formData.chartAccountId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, chartAccountId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {chartAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id.toString()}>
                          {acc.code} - {acc.name}
                          {acc.requiresCostCenter && (
                            <span className="ml-2 text-xs text-red-600">
                              (Exige CC)
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>
                    Centro de Custo
                    {requiresCostCenter && (
                      <span className="ml-2 text-xs text-red-600 font-semibold">
                        *
                      </span>
                    )}
                  </Label>
                  <Select
                    value={formData.costCenterId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, costCenterId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o centro de custo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id.toString()}>
                          {cc.code} - {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancelar
                </Button>
                <ShimmerButton type="submit" disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Criar Conta"}
                </ShimmerButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}

