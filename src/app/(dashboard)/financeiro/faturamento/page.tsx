"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, DollarSign, Mail, CheckCircle, Plus, Download, Send, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface BillingInvoice {
  id: number;
  invoiceNumber: string;
  customerName: string;
  periodStart: Date;
  periodEnd: Date;
  totalCtes: number;
  netValue: string;
  dueDate: Date;
  status: string;
  barcodeNumber?: string;
  pixKey?: string;
  pdfUrl?: string;
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const response = await fetch("/api/financial/billing");
      const data = await response.json();
      setInvoices(data.data || []);
    } catch (error) {
      console.error("Erro ao carregar faturas:", error);
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async () => {
    if (!customerId || !periodStart || !periodEnd) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/financial/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: parseInt(customerId),
          periodStart,
          periodEnd,
          billingFrequency: frequency,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Sucesso!",
          description: "Fatura criada com sucesso",
        });
        loadInvoices();
        setCustomerId("");
        setPeriodStart("");
        setPeriodEnd("");
      } else {
        toast({
          title: "Erro",
          description: data.error,
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
      setCreating(false);
    }
  };

  const generateBoleto = async (invoiceId: number) => {
    try {
      const response = await fetch(`/api/financial/billing/${invoiceId}/generate-boleto`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Boleto Gerado!",
          description: "Boleto criado com sucesso",
        });
        loadInvoices();
      } else {
        toast({
          title: "Erro",
          description: data.error,
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
    }
  };

  const downloadPDF = async (invoiceId: number) => {
    window.open(`/api/financial/billing/${invoiceId}/pdf`, "_blank");
  };

  const sendEmail = async (invoiceId: number) => {
    const email = prompt("Email do destinatário:");
    if (!email) return;

    try {
      const response = await fetch(`/api/financial/billing/${invoiceId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Email Enviado!",
          description: `Fatura enviada para ${email}`,
        });
        loadInvoices();
      } else {
        toast({
          title: "Erro",
          description: data.error,
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
    }
  };

  const finalize = async (invoiceId: number) => {
    if (!confirm("Finalizar fatura? Isso criará o título no Contas a Receber.")) return;

    try {
      const response = await fetch(`/api/financial/billing/${invoiceId}/finalize`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Fatura Finalizada!",
          description: "Título criado no Contas a Receber",
        });
        loadInvoices();
      } else {
        toast({
          title: "Erro",
          description: data.error,
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
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, unknown> = {
      DRAFT: { label: "Rascunho", variant: "secondary" },
      SENT: { label: "Enviada", variant: "default" },
      FINALIZED: { label: "Finalizada", variant: "default" },
    };

    const config = variants[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
            📄 Faturamento Agrupado
          </h1>
          <p className="text-slate-400">
            Consolide CTes em faturas únicas
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Fatura
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Fatura Consolidada</DialogTitle>
              <DialogDescription>
                Selecione o cliente e período para agrupar CTes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Cliente (ID)</Label>
                <Input
                  type="number"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="ID do cliente"
                />
              </div>

              <div>
                <Label>Período Inicial</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>

              <div>
                <Label>Período Final</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>

              <div>
                <Label>Frequência</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                    <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={createInvoice}
                disabled={creating}
                className="w-full"
              >
                {creating ? "Criando..." : "Criar Fatura"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Faturas */}
      <div className="grid gap-4">
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhuma fatura encontrada
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {invoice.invoiceNumber}
                      {getStatusBadge(invoice.status)}
                    </CardTitle>
                    <CardDescription>
                      {invoice.customerName} • {invoice.totalCtes} CTes
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      R$ {parseFloat(invoice.netValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Vence em {new Date(invoice.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {!invoice.barcodeNumber && invoice.status === "DRAFT" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateBoleto(invoice.id)}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Gerar Boleto
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadPDF(invoice.id)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>

                  {invoice.barcodeNumber && invoice.status !== "SENT" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendEmail(invoice.id)}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Email
                    </Button>
                  )}

                  {invoice.barcodeNumber && invoice.status !== "FINALIZED" && (
                    <Button
                      size="sm"
                      onClick={() => finalize(invoice.id)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Finalizar
                    </Button>
                  )}
                </div>

                {invoice.pixKey && (
                  <div className="mt-4 p-3 bg-muted rounded text-xs">
                    <strong>PIX:</strong> {invoice.pixKey.substring(0, 50)}...
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
