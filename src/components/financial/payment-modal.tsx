"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const paymentSchema = z.object({
  payDate: z.string(),
  amountPaid: z.number().positive(),
  bankAccountId: z.number().optional(),
  discount: z.number().default(0),
  interest: z.number().default(0),
  fine: z.number().default(0),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  payableId: number;
  description: string;
  amount: number;
  bankAccounts: Array<{ id: number; name: string }>;
  onSuccess: () => void;
  type?: "payable" | "receivable";
}

export function PaymentModal({
  open,
  onClose,
  payableId,
  description,
  amount,
  bankAccounts,
  onSuccess,
  type = "payable",
}: PaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payDate: format(new Date(), "yyyy-MM-dd"),
      amountPaid: amount,
      discount: 0,
      interest: 0,
      fine: 0,
      notes: "",
    },
  });

  const { register, handleSubmit, formState, watch, setValue } = form;
  const { errors } = formState;

  const handlePay = async (data: PaymentFormValues) => {
    setIsSubmitting(true);

    try {
      const endpoint = type === "payable" 
        ? `/api/financial/payables/${payableId}/pay`
        : `/api/financial/receivables/${payableId}/receive`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || "Erro ao registrar pagamento");
      }

      toast.success(
        type === "payable" ? "Pagamento registrado!" : "Recebimento registrado!",
        {
          description: `Valor: ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(data.amountPaid)}`,
        }
      );

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Erro ao registrar", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {type === "payable" ? "Registrar Pagamento" : "Registrar Recebimento"}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handlePay)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payDate">Data</Label>
              <Input
                id="payDate"
                type="date"
                {...register("payDate")}
                className={errors.payDate ? "border-red-500" : ""}
              />
              {errors.payDate && (
                <p className="text-sm text-red-500">{errors.payDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountPaid">Valor</Label>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                {...register("amountPaid", { valueAsNumber: true })}
                className={errors.amountPaid ? "border-red-500" : ""}
              />
              {errors.amountPaid && (
                <p className="text-sm text-red-500">{errors.amountPaid.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankAccountId">Conta Bancária *</Label>
            <Select
              onValueChange={(value) => setValue("bankAccountId", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id.toString()}>
                    {bank.name}
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
                {...register("discount", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interest">Juros</Label>
              <Input
                id="interest"
                type="number"
                step="0.01"
                {...register("interest", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fine">Multa</Label>
              <Input
                id="fine"
                type="number"
                step="0.01"
                {...register("fine", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Input id="notes" {...register("notes")} placeholder="Notas adicionais" />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar {type === "payable" ? "Pagamento" : "Recebimento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

