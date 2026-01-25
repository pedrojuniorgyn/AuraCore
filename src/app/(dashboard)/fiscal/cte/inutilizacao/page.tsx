"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fetchAPI } from "@/lib/api";

export default function CTeInutilizacaoPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    serie: "1",
    numberFrom: "",
    numberTo: "",
    year: new Date().getFullYear().toString(),
    justification: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await fetchAPI<{ success: boolean; message?: string; error?: string }>("/api/fiscal/cte/inutilize", {
        method: "POST",
        body: {
          serie: formData.serie,
          numberFrom: parseInt(formData.numberFrom),
          numberTo: parseInt(formData.numberTo),
          year: parseInt(formData.year),
          justification: formData.justification,
        },
      });

      if (data.success) {
        toast({
          title: "Sucesso!",
          description: "Numeração inutilizada com sucesso",
        });

        // Limpar form
        setFormData({
          ...formData,
          numberFrom: "",
          numberTo: "",
          justification: "",
        });
      } else {
        toast({
          title: "Erro",
          description: data.message || data.error,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
          🚫 Inutilização de Numeração CTe
        </h1>
        <p className="text-slate-400">
          Inutilize números de CTe que não foram utilizados
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados para Inutilização</CardTitle>
          <CardDescription>
            Preencha os dados da numeração que deseja inutilizar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Série</Label>
                <Input
                  value={formData.serie}
                  onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Ano</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número Inicial</Label>
                <Input
                  type="number"
                  value={formData.numberFrom}
                  onChange={(e) => setFormData({ ...formData, numberFrom: e.target.value })}
                  placeholder="Ex: 100"
                  required
                />
              </div>

              <div>
                <Label>Número Final</Label>
                <Input
                  type="number"
                  value={formData.numberTo}
                  onChange={(e) => setFormData({ ...formData, numberTo: e.target.value })}
                  placeholder="Ex: 105"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Justificativa (mínimo 15 caracteres)</Label>
              <Textarea
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                placeholder="Ex: Numeração pulada por erro no sistema..."
                rows={3}
                required
                minLength={15}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.justification.length} / 15 caracteres
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Atenção:</strong> A inutilização de numeração é irreversível.
                Certifique-se de que os números informados estão corretos e nunca foram utilizados.
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Inutilizando..." : "Inutilizar Numeração"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


