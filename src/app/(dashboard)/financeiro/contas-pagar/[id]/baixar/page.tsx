"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { GradientText } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { DollarSign, Calendar, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { differenceInDays } from "date-fns";

export default function BaixarContaPagarPage() {
  const params = useParams();
  const router = useRouter();
  const payableId = params.id as string;
  
  const [payable, setPayable] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Formulário
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [interestAmount, setInterestAmount] = useState(0);
  const [fineAmount, setFineAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [iofAmount, setIofAmount] = useState(0);
  const [bankFeeAmount, setBankFeeAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [autoCalculate, setAutoCalculate] = useState(true);
  
  // Buscar conta a pagar
  useEffect(() => {
    const fetchPayable = async () => {
      try {
        const response = await fetch(`/api/financial/payables/${payableId}`);
        const data = await response.json();
        setPayable(data);
      } catch (error) {
        console.error("Erro ao buscar conta:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPayable();
  }, [payableId]);
  
  // Cálculo automático de juros/multa
  useEffect(() => {
    if (!payable || !autoCalculate) return;
    
    const dueDate = new Date(payable.dueDate);
    const payment = new Date(paymentDate);
    const daysLate = differenceInDays(payment, dueDate);
    
    if (daysLate > 0) {
      const originalAmount = parseFloat(payable.amount);
      
      // Multa: 2% do valor
      setFineAmount(originalAmount * 0.02);
      
      // Juros: 0,1% ao dia
      setInterestAmount(originalAmount * 0.001 * daysLate);
    } else {
      setFineAmount(0);
      setInterestAmount(0);
    }
  }, [payable, paymentDate, autoCalculate]);
  
  // Calcular total
  const originalAmount = payable ? parseFloat(payable.amount) : 0;
  const netAmount = originalAmount + interestAmount + fineAmount - discountAmount + iofAmount + bankFeeAmount;
  
  // Submeter pagamento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/financial/payables/${payableId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentDate,
          paymentMethod,
          interestAmount,
          fineAmount,
          discountAmount,
          iofAmount,
          bankFeeAmount,
          notes,
          autoPost: true,
        }),
      });
      
      if (response.ok) {
        alert("Pagamento registrado com sucesso!");
        router.push("/financeiro/contas-pagar");
      } else {
        const error = await response.json();
        alert(`Erro: ${error.error}`);
      }
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      alert("Erro ao registrar pagamento");
    }
  };
  
  if (loading) return <div className="p-8">Carregando...</div>;
  if (!payable) return <div className="p-8">Conta não encontrada</div>;
  
  return (
    <PageTransition>
      <div className="p-8 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div>
            <GradientText className="text-4xl font-bold mb-2">
              Baixar Conta a Pagar
            </GradientText>
            <p className="text-slate-400">
              Registrar pagamento com juros, multa, IOF e tarifas
            </p>
          </div>
        </FadeIn>

        {/* Dados da Conta */}
        <FadeIn delay={0.2}>
          <GlassmorphismCard className="p-6 border-purple-500/20">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">Dados da Conta</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Fornecedor:</span>
                <p className="font-medium">{payable.partnerName || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-400">Descrição:</span>
                <p className="font-medium">{payable.description || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-400">Vencimento:</span>
                <p className="font-medium">{new Date(payable.dueDate).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <span className="text-slate-400">Valor Original:</span>
                <p className="text-2xl font-bold text-blue-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalAmount)}
                </p>
              </div>
            </div>
          </GlassmorphismCard>
        </FadeIn>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <FadeIn delay={0.3}>
            <GlassmorphismCard className="p-6 border-green-500/20">
              <h3 className="text-lg font-semibold text-green-400 mb-4">Dados do Pagamento</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Data */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Data do Pagamento *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-green-500/30 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                
                {/* Forma de Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Forma de Pagamento *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-green-500/30 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="PIX">PIX</option>
                    <option value="TED">TED</option>
                    <option value="DOC">DOC</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                
                {/* Cálculo Automático */}
                <div className="col-span-2 flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <input
                    type="checkbox"
                    checked={autoCalculate}
                    onChange={(e) => setAutoCalculate(e.target.checked)}
                    className="rounded"
                  />
                  <label className="text-sm text-blue-400">
                    Calcular juros e multa automaticamente (2% multa + 0,1% ao dia)
                  </label>
                </div>
                
                {/* Juros */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Juros (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={interestAmount}
                    onChange={(e) => setInterestAmount(parseFloat(e.target.value) || 0)}
                    disabled={autoCalculate}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-yellow-500/30 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
                  />
                </div>
                
                {/* Multa */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Multa (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(parseFloat(e.target.value) || 0)}
                    disabled={autoCalculate}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-orange-500/30 rounded-lg text-white focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                  />
                </div>
                
                {/* Desconto */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-green-500/30 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                {/* IOF */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    IOF (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={iofAmount}
                    onChange={(e) => setIofAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-red-500/30 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                  />
                </div>
                
                {/* Tarifa Bancária */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tarifa Bancária (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={bankFeeAmount}
                    onChange={(e) => setBankFeeAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                {/* Observações */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-500/30 rounded-lg text-white focus:ring-2 focus:ring-gray-500"
                    placeholder="Observações sobre o pagamento..."
                  />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Resumo */}
          <FadeIn delay={0.4}>
            <GlassmorphismCard className="p-6 border-cyan-500/20 bg-gradient-to-br from-cyan-900/20 to-cyan-800/10">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Resumo do Pagamento</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Valor Original:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalAmount)}
                  </span>
                </div>
                
                {interestAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-400">(+) Juros:</span>
                    <span className="font-medium text-yellow-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(interestAmount)}
                    </span>
                  </div>
                )}
                
                {fineAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-400">(+) Multa:</span>
                    <span className="font-medium text-orange-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fineAmount)}
                    </span>
                  </div>
                )}
                
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">(-) Desconto:</span>
                    <span className="font-medium text-green-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountAmount)}
                    </span>
                  </div>
                )}
                
                {iofAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-400">(+) IOF:</span>
                    <span className="font-medium text-red-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(iofAmount)}
                    </span>
                  </div>
                )}
                
                {bankFeeAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-400">(+) Tarifa Bancária:</span>
                    <span className="font-medium text-purple-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bankFeeAmount)}
                    </span>
                  </div>
                )}
                
                <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent my-3" />
                
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-cyan-400">Total a Pagar:</span>
                  <span className="text-3xl bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netAmount)}
                  </span>
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Ações */}
          <FadeIn delay={0.5}>
            <div className="flex gap-4 justify-end">
              <RippleButton
                type="button"
                onClick={() => router.back()}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600"
              >
                Cancelar
              </RippleButton>
              
              <RippleButton
                type="submit"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Pagamento
              </RippleButton>
            </div>
          </FadeIn>
        </form>
      </div>
    </PageTransition>
  );
}




