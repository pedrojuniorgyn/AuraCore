"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { FileText, QrCode, Loader2 } from "lucide-react";

export default function BTGTestesPage() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<unknown>(null);
  const { toast } = useToast();

  const gerarBoletoTeste = async () => {
    try {
      setLoading(true);
      setResultado(null);

      const response = await fetch("/api/btg/boletos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerName: "João da Silva Teste",
          payerDocument: "12345678901",
          payerEmail: "joao.teste@example.com",
          valor: 250.00,
          dataVencimento: "2025-12-20",
          descricao: "Teste de boleto BTG - Pedido #001",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResultado(data);
        toast({
          title: "✅ Boleto gerado com sucesso!",
          description: `Nosso número: ${data.boleto.nosso_numero}`,
        });
      } else {
        toast({
          title: "❌ Erro ao gerar boleto",
          description: data.error || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "❌ Erro",
        description: "Falha ao gerar boleto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const gerarPixTeste = async () => {
    try {
      setLoading(true);
      setResultado(null);

      const response = await fetch("/api/btg/pix/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor: 150.00,
          chavePix: "12345678000190", // Substitua pelo CNPJ real
          descricao: "Teste Pix BTG - Pedido #002",
          expiracao: 3600,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResultado(data);
        toast({
          title: "✅ Pix gerado com sucesso!",
          description: `TXID: ${data.charge.txid.substring(0, 20)}...`,
        });
      } else {
        toast({
          title: "❌ Erro ao gerar Pix",
          description: data.error || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "❌ Erro",
        description: "Falha ao gerar Pix",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
          🧪 BTG Pactual - Testes
        </h1>
        <p className="text-slate-400 mt-1">
          Página de testes para validar integração BTG
        </p>
      </div>

      {/* Botões de Teste */}
      <div className="grid grid-cols-2 gap-4">
        {/* Teste Boleto */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="font-semibold text-lg">Gerar Boleto</h3>
              <p className="text-sm text-gray-600">Valor: R$ 250,00</p>
            </div>
          </div>
          <Button
            onClick={gerarBoletoTeste}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              "Gerar Boleto de Teste"
            )}
          </Button>
        </div>

        {/* Teste Pix */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <QrCode className="w-8 h-8 text-purple-600" />
            <div>
              <h3 className="font-semibold text-lg">Gerar Pix</h3>
              <p className="text-sm text-gray-600">Valor: R$ 150,00</p>
            </div>
          </div>
          <Button
            onClick={gerarPixTeste}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              "Gerar Pix de Teste"
            )}
          </Button>
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-3">
            ✅ Resultado do Teste:
          </h3>
          
          {/* Boleto */}
          {resultado.boleto && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-green-700 font-semibold">Nosso Número:</p>
                <p className="font-mono bg-white px-3 py-2 rounded border">
                  {resultado.boleto.nosso_numero}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-green-700 font-semibold">Linha Digitável:</p>
                <p className="font-mono text-xs bg-white px-3 py-2 rounded border break-all">
                  {resultado.btgData.linha_digitavel}
                </p>
              </div>

              <div>
                <p className="text-sm text-green-700 font-semibold">PDF do Boleto:</p>
                <a
                  href={resultado.btgData.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  {resultado.btgData.pdf_url}
                </a>
              </div>

              <Button
                onClick={() => window.open(resultado.btgData.pdf_url, "_blank")}
                className="mt-4"
              >
                📄 Abrir PDF do Boleto
              </Button>
            </div>
          )}

          {/* Pix */}
          {resultado.charge && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-green-700 font-semibold">TXID:</p>
                <p className="font-mono text-xs bg-white px-3 py-2 rounded border break-all">
                  {resultado.charge.txid}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-green-700 font-semibold">QR Code (Pix Copia e Cola):</p>
                <textarea
                  className="font-mono text-xs bg-white px-3 py-2 rounded border w-full h-32"
                  value={resultado.charge.qr_code}
                  readOnly
                />
              </div>

              <Button
                onClick={() => {
                  navigator.clipboard.writeText(resultado.charge.qr_code);
                  toast({
                    title: "✅ Copiado!",
                    description: "QR Code copiado para área de transferência",
                  });
                }}
                className="mt-4"
              >
                📋 Copiar QR Code
              </Button>
            </div>
          )}

          {/* JSON Completo */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-green-700 font-semibold">
              🔍 Ver JSON completo
            </summary>
            <pre className="mt-2 bg-white p-4 rounded border text-xs overflow-auto max-h-96">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">
          📝 Instruções de Teste:
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>
            <strong>1. Boleto:</strong> Clique em &quot;Gerar Boleto de Teste&quot; para
            criar um boleto via BTG
          </li>
          <li>
            <strong>2. PDF:</strong> Após gerar, clique em &quot;Abrir PDF do Boleto&quot;
            para visualizar
          </li>
          <li>
            <strong>3. Pix:</strong> Clique em &quot;Gerar Pix de Teste&quot; para criar
            uma cobrança Pix com QR Code
          </li>
          <li>
            <strong>4. QR Code:</strong> Copie o código e use no app do banco
            para testar pagamento
          </li>
          <li>
            <strong>5. Dashboard:</strong> Volte para{" "}
            <a
              href="/financeiro/btg-dashboard"
              className="text-blue-600 hover:underline"
            >
              /financeiro/btg-dashboard
            </a>{" "}
            para ver os KPIs atualizados
          </li>
        </ul>
      </div>

      {/* Links */}
      <div className="flex gap-4">
        <Button
          onClick={() => (window.location.href = "/financeiro/btg-dashboard")}
          variant="outline"
        >
          ← Voltar para Dashboard BTG
        </Button>
        <Button
          onClick={() => (window.location.href = "/financeiro/faturamento")}
          variant="outline"
        >
          📄 Ir para Faturamento
        </Button>
      </div>
    </div>
  );
}
