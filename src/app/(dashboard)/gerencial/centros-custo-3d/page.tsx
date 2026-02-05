"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, ColDef, ICellRendererParams } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// AG Grid CSS (v34+ Theming API)
import "ag-grid-community/styles/ag-theme-quartz.css";

import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { ActionCellRenderer, BooleanCellRenderer } from "@/components/ag-grid/renderers/aurora-renderers";
import { Plus, Layers, Target, Truck, Building2, Loader2 } from "lucide-react";
import { fetchAPI } from "@/lib/api";

// Registrar módulos do AG Grid
ModuleRegistry.registerModules([AllEnterpriseModule]);

// Schema de validação
const editFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  branchId: z.number().min(1, "Filial é obrigatória"),
  serviceType: z.string().optional(),
  linkedObjectType: z.string().optional(),
  linkedObjectId: z.string().optional(),
  assetType: z.string().optional(),
  isAnalytical: z.boolean(),
  status: z.string(),
});

type EditFormData = z.infer<typeof editFormSchema>;

interface CostCenter3D {
  id: number;
  code: string;
  name: string;
  branch_id: number;
  service_type: 'FTL' | 'LTL' | 'ARMAZ' | 'DISTR' | null;
  linked_object_type?: string;
  linked_object_id?: string;
  asset_type?: string;
  is_analytical: boolean;
  branch_name: string;
  status: string;
}

export default function GestaoCC3DPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [costCenters, setCostCenters] = useState<CostCenter3D[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCC, setSelectedCC] = useState<CostCenter3D | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para exclusão
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [ccToDelete, setCCToDelete] = useState<CostCenter3D | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: "",
      branchId: 1,
      serviceType: "",
      linkedObjectType: "",
      linkedObjectId: "",
      assetType: "",
      isAnalytical: false,
      status: "ACTIVE",
    },
  });

  // Calcular stats a partir dos dados carregados
  const stats = useMemo(() => {
    if (costCenters.length === 0) {
      return { totalCCs: 0, branches: 0, serviceTypes: 0, objects: 0 };
    }
    
    const uniqueBranches = new Set(costCenters.map(cc => cc.branch_name));
    const uniqueServiceTypes = new Set(costCenters.map(cc => cc.service_type).filter(Boolean));
    const objectsCount = costCenters.filter(cc => cc.linked_object_id).length;
    
    return {
      totalCCs: costCenters.length,
      branches: uniqueBranches.size,
      serviceTypes: uniqueServiceTypes.size,
      objects: objectsCount
    };
  }, [costCenters]);

  useEffect(() => {
    fetchCostCenters();
  }, []);

  const fetchCostCenters = async () => {
    try {
      const result = await fetchAPI<{ success: boolean; data: CostCenter3D[] }>('/api/cost-centers/3d');
      if (result.success) {
        setCostCenters(result.data || []);
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handler de edição
  const handleEdit = useCallback((data: unknown) => {
    const cc = data as CostCenter3D;
    setSelectedCC(cc);
    form.reset({
      name: cc.name,
      branchId: cc.branch_id || 1,
      serviceType: cc.service_type || "",
      linkedObjectType: cc.linked_object_type || "",
      linkedObjectId: cc.linked_object_id || "",
      assetType: cc.asset_type || "",
      isAnalytical: cc.is_analytical || false,
      status: cc.status || "ACTIVE",
    });
    setIsEditModalOpen(true);
  }, [form]);

  // Handler de exclusão
  const handleDelete = useCallback((data: unknown) => {
    const cc = data as CostCenter3D;
    setCCToDelete(cc);
    setIsDeleteDialogOpen(true);
  }, []);

  // Submit de edição
  const onSubmitEdit = async (data: EditFormData) => {
    if (!selectedCC) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/cost-centers/3d/${selectedCC.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Centro de custo atualizado com sucesso!");
        setIsEditModalOpen(false);
        setSelectedCC(null);
        fetchCostCenters();
      } else {
        toast.error(result.error || "Erro ao atualizar centro de custo");
      }
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar centro de custo");
    } finally {
      setIsSaving(false);
    }
  };

  // Confirmar exclusão
  const confirmDelete = async () => {
    if (!ccToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/cost-centers/3d/${ccToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Centro de custo excluído com sucesso!");
        setIsDeleteDialogOpen(false);
        setCCToDelete(null);
        fetchCostCenters();
      } else {
        toast.error(result.error || "Erro ao excluir centro de custo");
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir centro de custo");
    } finally {
      setIsDeleting(false);
    }
  };

  const columnDefs: ColDef[] = [
    { field: 'code', headerName: 'Código', width: 180, pinned: 'left', filter: 'agTextColumnFilter', floatingFilter: true },
    { field: 'name', headerName: 'Nome', flex: 2, filter: 'agTextColumnFilter', floatingFilter: true },
    { 
      field: 'service_type', 
      headerName: 'Tipo Serviço (D2)',
      cellRenderer: (params: ICellRendererParams<CostCenter3D>) => {
        const types: Record<string, { label: string; color: string }> = {
          FTL: { label: 'Lotação', color: 'bg-purple-500/20 text-purple-400' },
          LTL: { label: 'Fracionado', color: 'bg-blue-500/20 text-blue-400' },
          ARMAZ: { label: 'Armazenagem', color: 'bg-green-500/20 text-green-400' },
          DISTR: { label: 'Distribuição', color: 'bg-yellow-500/20 text-yellow-400' }
        };
        const type = types[params.value] || { label: '-', color: 'bg-gray-500/20' };
        return <Badge className={type.color}>{type.label}</Badge>;
      },
      filter: 'agSetColumnFilter',
      width: 150
    },
    { 
      field: 'linked_object_type', 
      headerName: 'Objeto (D3)',
      cellRenderer: (params: ICellRendererParams<CostCenter3D>) => params.value ? <Badge className="aurora-badge">{params.value}</Badge> : '-',
      filter: 'agSetColumnFilter',
      width: 120
    },
    { field: 'linked_object_id', headerName: 'ID Objeto', width: 120 },
    { field: 'is_analytical', headerName: 'Analítico', cellRenderer: BooleanCellRenderer, filter: 'agSetColumnFilter', width: 120 },
    { field: 'branch_name', headerName: 'Filial (D1)', filter: 'agTextColumnFilter', width: 150 },
    { 
      field: 'actions', 
      headerName: 'Ações', 
      cellRenderer: ActionCellRenderer, 
      cellRendererParams: { 
        onEdit: handleEdit, 
        onDelete: handleDelete 
      }, 
      width: 120, 
      pinned: 'right' 
    }
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex justify-between items-center">
            <div>
              <GradientText className="text-4xl font-bold mb-2">Gestão de Centros de Custo 3D</GradientText>
              <p className="text-gray-400">Dimensões: Filial + Serviço + Objeto de Custo</p>
            </div>
            <RippleButton>
              <Plus className="w-4 h-4 mr-2" />Novo CC 3D
            </RippleButton>
          </div>
        </FadeIn>

        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <Layers className="w-10 h-10 text-purple-400" />
                <div>
                  <NumberCounter value={stats.totalCCs} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Total CCs 3D</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <Building2 className="w-10 h-10 text-blue-400" />
                <div>
                  <NumberCounter value={stats.branches} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Filiais (D1)</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <Truck className="w-10 h-10 text-green-400" />
                <div>
                  <NumberCounter value={stats.serviceTypes} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Tipos Serviço (D2)</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className={`hover:scale-105 transition-transform ${stats.objects > 0 ? 'pulsating' : ''}`}>
              <div className="flex items-center gap-4">
                <Target className="w-10 h-10 text-yellow-400" />
                <div>
                  <NumberCounter value={stats.objects} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Objetos (D3)</p>
                </div>
              </div>
            </GlassmorphismCard>
          </div>
        </StaggerContainer>

        <FadeIn delay={0.2}>
          <GlassmorphismCard>
            <GradientText className="text-2xl mb-4">Centros de Custo Tridimensionais</GradientText>
            
            <div className="ag-theme-quartz-dark" style={{ height: "calc(100vh - 300px)" }}>
              <AgGridReact
                ref={gridRef}
                
                rowData={costCenters}
                columnDefs={columnDefs}
                defaultColDef={{ sortable: true, resizable: true, filter: true }}
                sideBar={{ toolPanels: ['columns', 'filters'] }}
                enableRangeSelection={true}
                pagination={true}
                paginationPageSize={50}
                
                loading={loading}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Centro de Custo 3D</DialogTitle>
            <DialogDescription>
              Atualize as informações do centro de custo tridimensional.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
            {/* D0 - Informações Básicas */}
            <div className="space-y-4 border-b pb-4">
              <h4 className="font-medium text-sm text-muted-foreground">Informações Básicas</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Nome do centro de custo"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(value) => form.setValue("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Ativo</SelectItem>
                      <SelectItem value="INACTIVE">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="isAnalytical"
                    checked={form.watch("isAnalytical")}
                    onCheckedChange={(checked) => form.setValue("isAnalytical", checked)}
                  />
                  <Label htmlFor="isAnalytical">Centro Analítico</Label>
                </div>
              </div>
            </div>

            {/* D1 - Filial */}
            <div className="space-y-4 border-b pb-4">
              <h4 className="font-medium text-sm text-muted-foreground">D1 - Filial</h4>
              <div>
                <Label htmlFor="branchId">Filial *</Label>
                <Select
                  value={String(form.watch("branchId"))}
                  onValueChange={(value) => form.setValue("branchId", parseInt(value, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a filial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Matriz</SelectItem>
                    <SelectItem value="2">Filial SP</SelectItem>
                    <SelectItem value="3">Filial RJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* D2 - Tipo de Serviço */}
            <div className="space-y-4 border-b pb-4">
              <h4 className="font-medium text-sm text-muted-foreground">D2 - Tipo de Serviço</h4>
              <div>
                <Label htmlFor="serviceType">Tipo de Serviço</Label>
                <Select
                  value={form.watch("serviceType") || ""}
                  onValueChange={(value) => form.setValue("serviceType", value || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    <SelectItem value="FTL">Lotação (FTL)</SelectItem>
                    <SelectItem value="LTL">Fracionado (LTL)</SelectItem>
                    <SelectItem value="ARMAZ">Armazenagem</SelectItem>
                    <SelectItem value="DISTR">Distribuição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* D3 - Objeto de Custo */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">D3 - Objeto de Custo</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="linkedObjectType">Tipo de Objeto</Label>
                  <Select
                    value={form.watch("linkedObjectType") || ""}
                    onValueChange={(value) => form.setValue("linkedObjectType", value || "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      <SelectItem value="VEHICLE">Veículo</SelectItem>
                      <SelectItem value="DRIVER">Motorista</SelectItem>
                      <SelectItem value="ROUTE">Rota</SelectItem>
                      <SelectItem value="CLIENT">Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="linkedObjectId">ID do Objeto</Label>
                  <Input
                    id="linkedObjectId"
                    {...form.register("linkedObjectId")}
                    placeholder="ID do objeto vinculado"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="assetType">Tipo de Ativo</Label>
                <Input
                  id="assetType"
                  {...form.register("assetType")}
                  placeholder="Ex: FROTA_PROPRIA, AGREGADO"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o centro de custo{" "}
              <strong>{ccToDelete?.name}</strong> (código: {ccToDelete?.code})?
              <br /><br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
