"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, ColDef } from "ag-grid-community";
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
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { 
  TypeCellRenderer,
  AllocationRuleCellRenderer,
  AllocationBaseCellRenderer,
  BooleanCellRenderer,
  ActionCellRenderer
} from "@/components/ag-grid/renderers/aurora-renderers";
import { Plus, FileText, BookOpen, Settings, Edit, Trash2 } from "lucide-react";
import { fetchAPI } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Registrar módulos do AG Grid
ModuleRegistry.registerModules([AllEnterpriseModule]);

// Componente de edição separado para evitar reset de form
interface EditChartAccountModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  selectedAccount: ChartAccount | null;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  onSuccess: () => void;
}

const EditChartAccountModal: React.FC<EditChartAccountModalProps> = ({
  isOpen,
  onClose,
  selectedAccount,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
}) => {
  // Valores padrão vazios - form será populado pelo useEffect
  const form = useForm<ChartAccountFormValues>({
    resolver: zodResolver(chartAccountSchema),
    defaultValues: {
      name: '',
      description: null,
      type: 'DESPESA',
      category: null,
      legal_account_id: null,
      allocation_rule: null,
      allocation_base: null,
      status: 'ACTIVE',
    },
  });

  // Reset form quando selectedAccount mudar - única fonte de verdade para popular o form
  React.useEffect(() => {
    if (selectedAccount) {
      form.reset({
        name: selectedAccount.name,
        description: selectedAccount.description ?? null,
        type: selectedAccount.type,
        category: selectedAccount.category ?? null,
        legal_account_id: selectedAccount.legal_account_id ?? null,
        allocation_rule: selectedAccount.allocation_rule ?? null,
        allocation_base: selectedAccount.allocation_base ?? null,
        status: selectedAccount.status,
      });
    }
  }, [selectedAccount, form]);

  const onSubmit = async (values: ChartAccountFormValues) => {
    if (!selectedAccount?.id) return;

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/management/chart-accounts/${selectedAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: values.name,
          description: values.description || null,
          type: values.type,
          category: values.category || null,
          legalAccountId: values.legal_account_id || null,
          allocationRule: values.allocation_rule || null,
          allocationBase: values.allocation_base || null,
          status: values.status,
        }),
      });

      if (!response.ok) {
        // Tentar parsear JSON de erro, mas tratar falhas graciosamente
        let errorMessage = `Erro ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Se não conseguir parsear JSON (ex: página de erro HTML do nginx/proxy),
          // usar mensagem baseada no status code
        }
        throw new Error(errorMessage);
      }

      toast.success('Conta atualizada com sucesso!');
      onClose(false);
      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar conta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Conta Gerencial
          </DialogTitle>
          <DialogDescription>
            Código: {selectedAccount?.code} - {selectedAccount?.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Despesas com Pessoal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição detalhada da conta..." 
                      {...field} 
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo e Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RECEITA">Receita</SelectItem>
                        <SelectItem value="DESPESA">Despesa</SelectItem>
                        <SelectItem value="CUSTO">Custo</SelectItem>
                        <SelectItem value="INVESTIMENTO">Investimento</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Ativa</SelectItem>
                        <SelectItem value="INACTIVE">Inativa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Categoria */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Operacional, Administrativa..." 
                      {...field} 
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Agrupamento interno para relatórios
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Regra de Alocação */}
            <FormField
              control={form.control}
              name="allocation_rule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Regra de Alocação</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ex: Rateio proporcional por receita..." 
                      {...field} 
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Definição de como alocar custos/receitas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Base de Alocação */}
            <FormField
              control={form.control}
              name="allocation_base"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base de Alocação</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Receita Bruta, Quantidade..." 
                      {...field} 
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Footer */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// Componente de exclusão separado para evitar stale closures
interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  accountToDelete: ChartAccount | null;
  isDeleting: boolean;
  setIsDeleting: (value: boolean) => void;
  onSuccess: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  accountToDelete,
  isDeleting,
  setIsDeleting,
  onSuccess,
}) => {
  const handleConfirmDelete = async () => {
    if (!accountToDelete?.id) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/management/chart-accounts/${accountToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        // Tentar parsear JSON de erro, mas tratar falhas graciosamente
        let errorMessage = `Erro ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Se não conseguir parsear JSON (ex: página de erro HTML do nginx/proxy),
          // usar mensagem baseada no status code
        }
        throw new Error(errorMessage);
      }

      toast.success('Conta excluída com sucesso!');
      onClose(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir conta');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Confirmar Exclusão
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. A conta será marcada como excluída.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm">
            Deseja realmente excluir a conta:
          </p>
          <p className="font-semibold mt-2">
            {accountToDelete?.code} - {accountToDelete?.name}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onClose(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Excluindo...' : 'Excluir Conta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const chartAccountSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(200),
  description: z.string().max(1000).nullish(),
  type: z.enum(['RECEITA', 'DESPESA', 'CUSTO', 'INVESTIMENTO']),
  category: z.string().max(100).nullish(),
  legal_account_id: z.number().int().positive().nullish(),
  allocation_rule: z.string().max(500).nullish(),
  allocation_base: z.string().max(100).nullish(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type ChartAccountFormValues = z.infer<typeof chartAccountSchema>;

interface ChartAccount {
  id?: number;
  code: string;
  name: string;
  description?: string | null;
  type: 'RECEITA' | 'DESPESA' | 'CUSTO' | 'INVESTIMENTO';
  category?: string | null;
  parent_id?: number | null;
  level: number;
  is_analytical: boolean;
  legal_account_id?: number | null;
  legal_account_code?: string;
  legal_account_name?: string | null;
  allocation_rule?: string | null;
  allocation_base?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export default function GestaoPCGPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    analytical: 0,
    mapped: 0,
    rules: 0
  });

  // Estados para edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para exclusão
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<ChartAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const result = await fetchAPI<{ success: boolean; data: ChartAccount[] }>('/api/management/chart-accounts');
      
      if (result.success) {
        setAccounts(result.data);
        calculateStats(result.data);
      }
    } catch (error) {
      console.error("Erro ao buscar contas:", error);
      toast.error("Erro ao carregar contas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateStats = (data: ChartAccount[]) => {
    setStats({
      total: data.length,
      analytical: data.filter(a => a.is_analytical).length,
      mapped: data.filter(a => a.legal_account_id).length,
      rules: data.filter(a => a.allocation_rule && a.allocation_rule !== 'MANUAL').length
    });
  };

  const handleEdit = useCallback((data: unknown) => {
    const account = data as ChartAccount;
    setSelectedAccount(account);
    setIsEditModalOpen(true);
  }, []);

  const handleDelete = useCallback((data: unknown) => {
    const account = data as ChartAccount;
    setAccountToDelete(account);
    setIsDeleteDialogOpen(true);
  }, []);

  const columnDefs: ColDef[] = [
    { 
      field: 'code', 
      headerName: 'Código',
      width: 180,
      pinned: 'left',
      filter: 'agTextColumnFilter',
      floatingFilter: true
    },
    { 
      field: 'name', 
      headerName: 'Nome da Conta',
      flex: 2,
      filter: 'agTextColumnFilter',
      floatingFilter: true
    },
    { 
      field: 'type', 
      headerName: 'Tipo',
      cellRenderer: TypeCellRenderer,
      filter: 'agSetColumnFilter',
      width: 130
    },
    { 
      field: 'legal_account_code', 
      headerName: 'Conta Legal (PCC)',
      width: 150
    },
    { 
      field: 'allocation_rule', 
      headerName: 'Regra Alocação',
      cellRenderer: AllocationRuleCellRenderer,
      filter: 'agSetColumnFilter',
      width: 150
    },
    { 
      field: 'allocation_base', 
      headerName: 'Base',
      cellRenderer: AllocationBaseCellRenderer,
      width: 150
    },
    { 
      field: 'is_analytical', 
      headerName: 'Analítica',
      cellRenderer: BooleanCellRenderer,
      filter: 'agSetColumnFilter',
      width: 120
    },
    { 
      field: 'actions', 
      headerName: 'Ações',
      cellRenderer: ActionCellRenderer,
      cellRendererParams: {
        onEdit: handleEdit,
        onDelete: handleDelete,
      },
      width: 120,
      pinned: 'right'
    }
  ];

  return (
    <>
      <PageTransition>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex justify-between items-center">
            <div>
              <GradientText className="text-4xl font-bold mb-2">
                Gestão de Plano Gerencial (PCG)
              </GradientText>
              <p className="text-gray-400">
                Contas Gerenciais para DRE Customizado
              </p>
            </div>
            <RippleButton>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta Gerencial
            </RippleButton>
          </div>
        </FadeIn>

        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <BookOpen className="w-10 h-10 text-purple-400" />
                <div>
                  <NumberCounter value={stats.total} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Contas Gerenciais</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <FileText className="w-10 h-10 text-blue-400" />
                <div>
                  <NumberCounter value={stats.analytical} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Contas Analíticas</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <Settings className="w-10 h-10 text-green-400" />
                <div>
                  <NumberCounter value={stats.mapped} suffix="%" className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Mapeadas (PCC↔PCG)</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform pulsating">
              <div className="flex items-center gap-4">
                <Settings className="w-10 h-10 text-yellow-400" />
                <div>
                  <NumberCounter value={stats.rules} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Regras de Alocação</p>
                </div>
              </div>
            </GlassmorphismCard>
          </div>
        </StaggerContainer>

        <FadeIn delay={0.2}>
          <GlassmorphismCard>
            <GradientText className="text-2xl mb-4">
              Plano de Contas Gerencial
            </GradientText>
            
            <div className="ag-theme-quartz-dark" style={{ height: "calc(100vh - 300px)", width: '100%' }}>
              <AgGridReact
                ref={gridRef}
                
                rowData={accounts}
                columnDefs={columnDefs}
                defaultColDef={{
                  sortable: true,
                  resizable: true,
                  filter: true
                }}
                sideBar={{
                  toolPanels: ['columns', 'filters']
                }}
                enableRangeSelection={true}
                pagination={true}
                paginationPageSize={50}
                
                loading={loading}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>

    </PageTransition>

      {/* Modais - FORA do PageTransition (FIXED-001) */}
      <EditChartAccountModal 
        isOpen={isEditModalOpen}
        onClose={(open) => {
          setIsEditModalOpen(open);
          if (!open) {
            setSelectedAccount(null);
          }
        }}
        selectedAccount={selectedAccount}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        onSuccess={fetchAccounts}
      />
      <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setAccountToDelete(null);
          }
        }}
        accountToDelete={accountToDelete}
        isDeleting={isDeleting}
        setIsDeleting={setIsDeleting}
        onSuccess={fetchAccounts}
      />
    </>
  );
}


