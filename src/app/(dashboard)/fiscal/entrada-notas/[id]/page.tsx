"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Package, CheckCircle, AlertTriangle, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ItemLinkerModal } from "@/components/fiscal/item-linker-modal";

/**
 * 📋 DETALHES DA NFe DE ENTRADA
 * 
 * Exibe:
 * - Cabeçalho da NFe (fornecedor, chave, datas, valores)
 * - Itens da NFe com status de vinculação de produtos
 */

interface Invoice {
  id: number;
  accessKey: string;
  series: string | null;
  number: string | null;
  model: string | null;
  issueDate: string;
  totalProducts: string | null;
  totalNfe: string | null;
  status: string;
  partnerName: string | null;
  partnerDocument: string | null;
  partnerTradeName: string | null;
}

interface InvoiceItem {
  id: number;
  productId: number | null;
  productCodeXml: string | null;
  productNameXml: string | null;
  eanXml: string | null;
  ncm: string | null;
  cfop: string | null;
  cst: string | null;
  quantity: string;
  unit: string | null;
  unitPrice: string | null;
  totalPrice: string | null;
  itemNumber: number | null;
  // Produto vinculado
  productSku: string | null;
  productName: string | null;
}

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal de vinculação
  const [isLinkerOpen, setIsLinkerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InvoiceItem | null>(null);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  const handleOpenLinker = (item: InvoiceItem) => {
    setSelectedItem(item);
    setIsLinkerOpen(true);
  };

  const handleLinkerSuccess = () => {
    fetchInvoiceDetails(); // Recarrega os dados
  };

  const fetchInvoiceDetails = async () => {
    try {
      setIsLoading(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";

      const response = await fetch(`/api/inbound-invoices/${id}`, {
        headers: {
          "x-branch-id": branchId,
        },
      });

      if (!response.ok) {
        toast.error("Erro ao carregar NFe");
        router.push("/fiscal/entrada-notas");
        return;
      }

      const data = await response.json();
      setInvoice(data.invoice);
      setItems(data.items || []);
    } catch (error) {
      console.error("❌ Erro ao buscar NFe:", error);
      toast.error("Erro ao carregar NFe");
      router.push("/fiscal/entrada-notas");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(value));
  };

  const formatNCM = (ncm: string | null) => {
    if (!ncm || ncm.length !== 8) return ncm;
    return `${ncm.slice(0, 4)}.${ncm.slice(4, 6)}.${ncm.slice(6)}`;
  };

  if (isLoading || !invoice) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const linkedItems = items.filter(item => item.productId !== null).length;
  const pendingItems = items.filter(item => item.productId === null).length;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          NFe #{invoice.number} - Série {invoice.series}
        </h2>
        <p className="text-muted-foreground">
          Chave de Acesso: {invoice.accessKey}
        </p>
      </div>

      {/* Card: Dados da NFe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dados da Nota Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Fornecedor (Emitente)</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Razão Social:</strong> {invoice.partnerName || "—"}
              </div>
              <div>
                <strong>Nome Fantasia:</strong> {invoice.partnerTradeName || "—"}
              </div>
              <div>
                <strong>CNPJ:</strong> {invoice.partnerDocument || "—"}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Informações da NFe</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Modelo:</strong> {invoice.model || "—"}
              </div>
              <div>
                <strong>Data Emissão:</strong>{" "}
                {new Date(invoice.issueDate).toLocaleDateString("pt-BR")}
              </div>
              <div>
                <strong>Total Produtos:</strong> {formatCurrency(invoice.totalProducts)}
              </div>
              <div>
                <strong>Total NFe:</strong>{" "}
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(invoice.totalNfe)}
                </span>
              </div>
              <div>
                <strong>Status:</strong>{" "}
                <Badge variant={invoice.status === "IMPORTED" ? "default" : "secondary"}>
                  {invoice.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card: Itens da NFe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens da Nota Fiscal
          </CardTitle>
          <CardDescription>
            Total: {items.length} itens |{" "}
            <span className="text-green-500">{linkedItems} vinculados</span> |{" "}
            <span className="text-yellow-500">{pendingItems} pendentes</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead className="w-[120px]">Código XML</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[100px]">NCM</TableHead>
                <TableHead className="w-[100px]">CFOP</TableHead>
                <TableHead className="w-[80px]">Qtde</TableHead>
                <TableHead className="w-[100px]">Preço Unit</TableHead>
                <TableHead className="w-[120px]">Total</TableHead>
                <TableHead className="w-[200px]">Produto Vinculado</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Nenhum item encontrado
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.itemNumber}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.productCodeXml}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {item.productNameXml}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatNCM(item.ncm)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.cfop}</TableCell>
                    <TableCell className="text-right">
                      {parseFloat(item.quantity).toFixed(3)} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(item.totalPrice)}
                    </TableCell>
                    <TableCell>
                      {item.productId ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {item.productSku} - {item.productName}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Pendente de Vínculo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!item.productId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenLinker(item)}
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Vincular
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ações */}
      {pendingItems > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-yellow-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Produtos Pendentes de Vinculação
            </CardTitle>
            <CardDescription>
              {pendingItems} {pendingItems === 1 ? "item" : "itens"} ainda não{" "}
              {pendingItems === 1 ? "foi vinculado" : "foram vinculados"} a produtos do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Você pode cadastrar esses produtos manualmente ou aguardar futuras importações para
              vinculação automática.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push("/cadastros/produtos/create")}
            >
              Cadastrar Novo Produto
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal de Vinculação */}
      {selectedItem && (
        <ItemLinkerModal
          isOpen={isLinkerOpen}
          onClose={() => setIsLinkerOpen(false)}
          item={selectedItem}
          onSuccess={handleLinkerSuccess}
        />
      )}
    </div>
  );
}

