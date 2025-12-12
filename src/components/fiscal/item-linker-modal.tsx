"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaskedInput } from "@/components/ui/masked-input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InvoiceItem {
  id: number;
  productCodeXml: string | null;
  productNameXml: string | null;
  ncm: string | null;
  unit: string | null;
  unitPrice: string | null;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  ncm: string;
}

interface ItemLinkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InvoiceItem;
  onSuccess: () => void;
}

/**
 * 🔗 MODAL DE VINCULAÇÃO DE PRODUTO
 * 
 * Permite vincular itens da NFe a produtos do sistema de 2 formas:
 * 1. Vincular a produto existente (combobox)
 * 2. Criar novo produto e vincular
 */

export function ItemLinkerModal({ isOpen, onClose, item, onSuccess }: ItemLinkerModalProps) {
  const [mode, setMode] = useState<"link" | "create">("link");
  const [isLoading, setIsLoading] = useState(false);

  // Link mode
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Create mode
  const [newProduct, setNewProduct] = useState({
    sku: item.productCodeXml || "",
    name: item.productNameXml || "",
    ncm: item.ncm || "",
    unit: item.unit || "UN",
    origin: "0",
    priceCost: item.unitPrice ? parseFloat(item.unitPrice) : undefined,
  });

  // Carrega produtos existentes
  useEffect(() => {
    if (isOpen && mode === "link") {
      fetchProducts();
    }
  }, [isOpen, mode]);

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";

      const response = await fetch("/api/products?_start=0&_end=1000", {
        headers: {
          "x-branch-id": branchId,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setProducts(result.data || []);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar produtos:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleLinkExisting = async () => {
    if (!selectedProductId) {
      toast.error("Selecione um produto");
      return;
    }

    try {
      setIsLoading(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";

      const response = await fetch(`/api/inbound-invoices/items/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-branch-id": branchId,
        },
        body: JSON.stringify({
          product_id: selectedProductId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Erro ao vincular produto");
        return;
      }

      const result = await response.json();
      toast.success(`Produto vinculado: ${result.data.productName}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("❌ Erro ao vincular:", error);
      toast.error("Erro ao vincular produto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!newProduct.sku || !newProduct.name || !newProduct.ncm) {
      toast.error("Preencha SKU, Nome e NCM");
      return;
    }

    try {
      setIsLoading(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";

      const response = await fetch(`/api/inbound-invoices/items/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-branch-id": branchId,
        },
        body: JSON.stringify({
          create_new: true,
          product_data: {
            ...newProduct,
            ncm: newProduct.ncm.replace(/\D/g, ""), // Remove formatação
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Erro ao criar produto");
        return;
      }

      const result = await response.json();
      toast.success(`Produto criado e vinculado: ${result.data.productName}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("❌ Erro ao criar:", error);
      toast.error("Erro ao criar produto");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vincular Produto</DialogTitle>
          <DialogDescription>
            Item: {item.productNameXml} (Código: {item.productCodeXml})
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "link" | "create")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">🔗 Vincular Existente</TabsTrigger>
            <TabsTrigger value="create">➕ Criar Novo</TabsTrigger>
          </TabsList>

          {/* TAB 1: Vincular a Existente */}
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione o Produto</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {selectedProduct
                      ? `${selectedProduct.sku} - ${selectedProduct.name}`
                      : "Selecione um produto..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar produto..." />
                    <CommandList>
                      <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                      <CommandGroup>
                        {isLoadingProducts ? (
                          <CommandItem disabled>Carregando...</CommandItem>
                        ) : (
                          products.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={`${product.sku} ${product.name}`}
                              onSelect={() => {
                                setSelectedProductId(product.id);
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProductId === product.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="font-mono text-xs mr-2">{product.sku}</span>
                              <span>{product.name}</span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                NCM: {product.ncm}
                              </span>
                            </CommandItem>
                          ))
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                {products.length} produtos disponíveis no sistema
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleLinkExisting}
                disabled={!selectedProductId || isLoading}
              >
                {isLoading ? "Vinculando..." : "Vincular Produto"}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* TAB 2: Criar Novo */}
          <TabsContent value="create" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SKU *</Label>
                  <Input
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    placeholder="PROD-001"
                    className="uppercase font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unidade *</Label>
                  <Input
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    placeholder="UN"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome do Produto *</Label>
                <Input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Nome do produto"
                />
                <p className="text-xs text-muted-foreground">
                  Sugestão do XML: {item.productNameXml}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>NCM *</Label>
                  <MaskedInput
                    mask="0000.00.00"
                    value={newProduct.ncm}
                    onChange={(value) => setNewProduct({ ...newProduct, ncm: value })}
                    placeholder="0000.00.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preço de Custo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProduct.priceCost || ""}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        priceCost: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sugestão do XML: R$ {parseFloat(item.unitPrice || "0").toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateNew}
                disabled={isLoading}
              >
                {isLoading ? "Criando..." : "Criar e Vincular"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}















