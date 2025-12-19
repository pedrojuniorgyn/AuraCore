"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Package, DollarSign, TrendingUp, Truck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { ShimmerButton } from "@/components/ui/magic-components";

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

interface CalculationResult {
  freightWeight: number;
  realWeight: number;
  cubicWeight: number;
  baseFreight: number;
  components: Array<{
    name: string;
    type: string;
    calculationBase: number;
    rate: number;
    value: number;
  }>;
  subtotal: number;
  total: number;
  tableUsed: {
    id: number;
    name: string;
    type: string;
  };
}

export function FreightSimulator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  
  // Form state
  const [realWeight, setRealWeight] = useState("50");
  const [volume, setVolume] = useState("0.5");
  const [invoiceValue, setInvoiceValue] = useState("5000");
  const [originState, setOriginState] = useState("SP");
  const [destinationState, setDestinationState] = useState("RJ");
  const [transportType, setTransportType] = useState("LTL_FRACIONADO");

  const handleCalculate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/commercial/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          realWeight: Number(realWeight),
          volume: Number(volume),
          invoiceValue: Number(invoiceValue),
          originState,
          destinationState,
          transportType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.calculation);
        toast.success("Frete calculado com sucesso!");
      } else {
        toast.error(data.error || "Erro ao calcular frete");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Falha ao calcular frete");
    } finally {
      setLoading(false);
    }
  };

  const isCubicWeight = result && result.cubicWeight > result.realWeight;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Formulário */}
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            <GradientText>Simulador de Frete</GradientText>
          </CardTitle>
          <CardDescription>
            Calcule o valor do frete automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo de Transporte */}
          <div className="space-y-2">
            <Label htmlFor="transportType">Tipo de Transporte</Label>
            <Select value={transportType} onValueChange={setTransportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LTL_FRACIONADO">Fracionado (LTL)</SelectItem>
                <SelectItem value="FTL_LOTACAO">Lotação (FTL)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Origem e Destino */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">UF Origem</Label>
              <Select value={originState} onValueChange={setOriginState}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">UF Destino</Label>
              <Select value={destinationState} onValueChange={setDestinationState}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Peso e Volume */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Peso Real (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={realWeight}
                onChange={(e) => setRealWeight(e.target.value)}
                placeholder="50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="volume">Volume (m³)</Label>
              <Input
                id="volume"
                type="number"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="0.5"
              />
            </div>
          </div>

          {/* Valor da NF */}
          <div className="space-y-2">
            <Label htmlFor="invoiceValue">Valor da Nota Fiscal (R$)</Label>
            <Input
              id="invoiceValue"
              type="number"
              value={invoiceValue}
              onChange={(e) => setInvoiceValue(e.target.value)}
              placeholder="5000"
            />
          </div>

          {/* Botão Calcular */}
          <ShimmerButton
            onClick={handleCalculate}
            disabled={loading}
            className="w-full"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {loading ? "Calculando..." : "Calcular Frete"}
          </ShimmerButton>
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resultado do Cálculo
          </CardTitle>
          <CardDescription>
            {result ? `Tabela: ${result.tableUsed.name}` : "Aguardando cálculo..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <p>Preencha os dados e clique em "Calcular Frete"</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Peso Cobrado */}
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Peso Cobrado</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">
                      {result.freightWeight.toFixed(2)} kg
                    </span>
                    {isCubicWeight && (
                      <AlertCircle className="h-4 w-4 text-orange-500" title="Peso cubado aplicado" />
                    )}
                  </div>
                </div>
                {isCubicWeight && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Peso cubado ({result.cubicWeight.toFixed(2)} kg) maior que peso real ({result.realWeight.toFixed(2)} kg)
                  </p>
                )}
              </div>

              {/* Detalhamento */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    Frete Base
                  </span>
                  <span className="font-medium">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(result.baseFreight)}
                  </span>
                </div>

                {/* Componentes Extras */}
                {result.components.map((component, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      {component.name}
                      {component.type === "PERCENTAGE" && (
                        <span className="text-xs text-muted-foreground">
                          ({component.rate}%)
                        </span>
                      )}
                    </span>
                    <span className="font-medium">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(component.value)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total do Frete</span>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      <NumberCounter
                        value={result.total}
                        decimals={2}
                        prefix="R$ "
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Valor final a cobrar
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




















