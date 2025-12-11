"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface PaymentModalProps {
  payableId: number;
  amount: number;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentModal({ payableId, amount, description, open, onOpenChange }: PaymentModalProps) {
  const queryClient = useQueryClient();
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amountPaid, setAmountPaid] = useState(amount.toString());
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [discount, setDiscount] = useState("0");
  const [interest, setInterest] = useState("0");
  const [fine, setFine] = useState("0");
  const [notes, setNotes] = useState("");

  // Busca contas bancárias
  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/financial/bank-accounts", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Falha ao carregar contas bancárias");
      return response.json();
    },
    enabled: open,
  });

  // Mutation de pagamento
  const payMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/financial/payables/${payableId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          payDate: new Date(payDate),
          amountPaid: parseFloat(amountPaid),
          discount: parseFloat(discount),
          interest: parseFloat(interest),
          fine: parseFloat(fine),
          bankAccountId: bankAccountId ? parseInt(bankAccountId) : null,
          notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || "Falha ao registrar pagamento");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Pagamento registrado com sucesso!", {
        description: `Valor: R$ ${parseFloat(amountPaid).toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao registrar pagamento", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bankAccountId) {
      toast.error("Selecione uma conta bancária");
      return;
    }

    payMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pay-date">Data do Pagamento *</Label>
              <Input
                id="pay-date"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount-paid">Valor Pago *</Label>
              <Input
                id="amount-paid"
                type="number"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank-account">Conta Bancária *</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId} required>
              <SelectTrigger id="bank-account">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts?.data?.map((account: any) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name} - Saldo: R$ {parseFloat(account.currentBalance).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Desconto</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interest">Juros</Label>
              <Input
                id="interest"
                type="number"
                step="0.01"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fine">Multa</Label>
              <Input
                id="fine"
                type="number"
                step="0.01"
                value={fine}
                onChange={(e) => setFine(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o pagamento (opcional)"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={payMutation.isPending}>
              {payMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}










