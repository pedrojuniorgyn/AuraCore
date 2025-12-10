/**
 * AG Grid Master-Detail - Painel de Detalhes da NFe
 * 
 * Componente que renderiza os itens da NFe quando expandida
 */

"use client";

import React from "react";
import { IDetailCellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { detailGridTheme } from "@/lib/ag-grid/theme";
import { CurrencyCellRenderer } from "@/lib/ag-grid/cell-renderers";

interface NFeItem {
  id: number;
  productId: number | null;
  productCodeXml: string;
  productNameXml: string;
  ncm: string;
  cfop: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  productName?: string;
}

export const NFeDetailPanel: React.FC<IDetailCellRendererParams> = (props) => {
  const { data } = props;
  const invoiceId = data.id;

  const [items, setItems] = React.useState<NFeItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch(`/api/inbound-invoices/${invoiceId}/items`, {
          credentials: "include",
        });
        if (response.ok) {
          const result = await response.json();
          setItems(result.data || []);
        }
      } catch (error) {
        console.error("Erro ao carregar itens:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [invoiceId]);

  const columnDefs = [
    {
      field: "productCodeXml",
      headerName: "Código",
      width: 120,
    },
    {
      field: "productNameXml",
      headerName: "Descrição",
      flex: 1,
      minWidth: 250,
    },
    {
      field: "ncm",
      headerName: "NCM",
      width: 110,
      cellRenderer: (params: any) => {
        if (!params.value) return "-";
        const ncm = params.value.replace(/\D/g, "");
        if (ncm.length === 8) {
          return `${ncm.substr(0, 4)}.${ncm.substr(4, 2)}.${ncm.substr(6, 2)}`;
        }
        return params.value;
      },
    },
    {
      field: "cfop",
      headerName: "CFOP",
      width: 90,
    },
    {
      field: "quantity",
      headerName: "Qtde",
      width: 100,
      type: "numericColumn",
      valueFormatter: (params: any) => {
        if (!params.value) return "-";
        return new Intl.NumberFormat("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        }).format(parseFloat(params.value));
      },
    },
    {
      field: "unitPrice",
      headerName: "Valor Unit.",
      width: 130,
      cellRenderer: CurrencyCellRenderer,
      type: "numericColumn",
    },
    {
      field: "totalPrice",
      headerName: "Total",
      width: 140,
      cellRenderer: CurrencyCellRenderer,
      type: "numericColumn",
      aggFunc: "sum",
    },
    {
      field: "productName",
      headerName: "Produto Vinculado",
      width: 200,
      cellRenderer: (params: any) => {
        if (params.data.productId && params.value) {
          return (
            <Badge variant="default" className="font-normal">
              ✓ {params.value}
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="font-normal text-amber-400">
            ⚠ Pendente
          </Badge>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Carregando itens...
      </div>
    );
  }

  return (
    <Card className="m-4 border-slate-700 bg-slate-800/50">
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            Itens da NFe ({items.length} {items.length === 1 ? "item" : "itens"})
          </h3>
          <Badge variant="outline">
            Total: {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(
              items.reduce((sum, item) => sum + parseFloat(item.totalPrice || "0"), 0)
            )}
          </Badge>
        </div>

        <div style={{ height: Math.min(items.length * 48 + 48, 400), width: "100%" }}>
          <AgGridReact
            rowData={items}
            columnDefs={columnDefs}
            theme={detailGridTheme}
            domLayout="autoHeight"
            suppressHorizontalScroll={false}
            headerHeight={40}
            rowHeight={40}
            groupIncludeTotalFooter={true}
            grandTotalRow="bottom"
            localeText={{
              sum: "Total",
              noRowsToShow: "Nenhum item encontrado",
            }}
          />
        </div>
      </div>
    </Card>
  );
};








