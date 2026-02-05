"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface Role {
  id: number;
  name: string;
  description: string | null;
}

interface Permission {
  id: number;
  slug: string;
  description: string | null;
  module: string | null;
}

/** Roles padrão que não podem ser renomeadas/excluídas */
const DEFAULT_ROLES = ["ADMIN", "MANAGER", "OPERATOR", "AUDITOR"] as const;

export default function RolesManagementPage() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para modais
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Estado do formulário
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Estado do modal de permissões
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [managingRole, setManagingRole] = useState<Role | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>(
    []
  );
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");

  /**
   * Busca lista de roles do backend
   */
  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/admin/roles", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setRoles(data.data || []);
      } else {
        console.error("Erro ao carregar roles:", data?.error);
      }
    } catch (error) {
      console.error("Erro ao carregar roles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  /**
   * Verifica se é uma role padrão do sistema
   */
  const isDefaultRole = (name: string): boolean => {
    return DEFAULT_ROLES.includes(name as (typeof DEFAULT_ROLES)[number]);
  };

  /**
   * Abre modal de criação
   */
  const openCreate = () => {
    setFormName("");
    setFormDescription("");
    setSaving(false);
    setCreateOpen(true);
  };

  /**
   * Abre modal de edição
   */
  const openEdit = (role: Role) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || "");
    setSaving(false);
    setEditOpen(true);
  };

  /**
   * Submete criação de nova role
   */
  const submitCreate = async () => {
    const trimmedName = formName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast.error("Nome inválido", {
        description: "O nome deve ter no mínimo 2 caracteres",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmedName,
          description: formDescription.trim() || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao criar role");
      }

      toast.success("Role criada com sucesso");
      setCreateOpen(false);
      await fetchRoles();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao criar role", { description: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Submete edição de role existente
   */
  const submitEdit = async () => {
    if (!editingRole) return;

    const trimmedName = formName.trim();
    const trimmedDescription = formDescription.trim();

    // Validação apenas se não for role padrão (que não pode renomear)
    if (!isDefaultRole(editingRole.name) && trimmedName.length < 2) {
      toast.error("Nome inválido", {
        description: "O nome deve ter no mínimo 2 caracteres",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/roles/${editingRole.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: isDefaultRole(editingRole.name) ? editingRole.name : trimmedName,
          description: trimmedDescription || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao editar role");
      }

      toast.success("Role atualizada com sucesso");
      setEditOpen(false);
      await fetchRoles();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao editar role", { description: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Exclui uma role customizada
   */
  const deleteRole = async (role: Role) => {
    const confirmed = confirm(
      `Deseja excluir esta role?\n\nNome: ${role.name}\nDescrição: ${role.description || "—"}\n\nEsta ação é irreversível.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao excluir role");
      }

      toast.success("Role excluída com sucesso");
      await fetchRoles();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao excluir role", { description: errorMessage });
    }
  };

  /**
   * Extrai o módulo do slug da permissão
   */
  const getModuleFromSlug = (slug: string): string => {
    const parts = slug.split(".");
    return parts[0] || "outros";
  };

  /**
   * Agrupa permissões por módulo
   */
  const groupPermissionsByModule = (perms: Permission[]) => {
    const groups: Record<string, Permission[]> = {};
    
    for (const perm of perms) {
      const moduleName = perm.module || getModuleFromSlug(perm.slug);
      if (!groups[moduleName]) {
        groups[moduleName] = [];
      }
      groups[moduleName].push(perm);
    }
    
    // Ordenar módulos alfabeticamente
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([module, permissions]) => ({
        module,
        permissions: permissions.sort((a, b) => a.slug.localeCompare(b.slug)),
      }));
  };

  /**
   * Filtra permissões pela busca
   */
  const filteredPermissions = allPermissions.filter((perm) => {
    if (!permissionSearch.trim()) return true;
    const search = permissionSearch.toLowerCase();
    return (
      perm.slug.toLowerCase().includes(search) ||
      perm.description?.toLowerCase().includes(search) ||
      perm.module?.toLowerCase().includes(search)
    );
  });

  /**
   * Permissões agrupadas e filtradas
   */
  const groupedPermissions = groupPermissionsByModule(filteredPermissions);

  /**
   * Abre modal de gerenciar permissões
   */
  const openPermissions = async (role: Role) => {
    setManagingRole(role);
    setPermissionsOpen(true);
    setLoadingPermissions(true);
    setSavingPermissions(false);
    setPermissionSearch("");

    try {
      // Buscar todas permissões e permissões do role em paralelo
      const [allRes, roleRes] = await Promise.all([
        fetch("/api/admin/permissions", { credentials: "include" }),
        fetch(`/api/admin/roles/${role.id}/permissions`, {
          credentials: "include",
        }),
      ]);

      if (allRes.ok) {
        const allData = await allRes.json();
        setAllPermissions(allData.data || []);
      }

      if (roleRes.ok) {
        const roleData = await roleRes.json();
        const permIds = (roleData.data?.permissions || []).map(
          (p: Permission) => p.id
        );
        setSelectedPermissionIds(permIds);
      }
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast.error("Erro ao carregar permissões");
    } finally {
      setLoadingPermissions(false);
    }
  };

  /**
   * Toggle de permissão no checkbox
   */
  const togglePermission = (permId: number) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId]
    );
  };

  /**
   * Salva permissões do role
   */
  const submitPermissions = async () => {
    if (!managingRole) return;

    setSavingPermissions(true);
    try {
      const res = await fetch(
        `/api/admin/roles/${managingRole.id}/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ permissionIds: selectedPermissionIds }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao atualizar permissões");
      }

      toast.success("Permissões atualizadas com sucesso");
      setPermissionsOpen(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao atualizar permissões", { description: errorMessage });
    } finally {
      setSavingPermissions(false);
    }
  };

  // Loading state
  if (permissionsLoading || loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Verificação de permissão
  if (!hasPermission("admin.roles.manage")) {
    return (
      <div className="p-6">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Acesso Negado
            </CardTitle>
            <CardDescription>
              Você não tem permissão para gerenciar roles.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Roles</h1>
          <p className="text-muted-foreground">
            Perfis de acesso do sistema
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Role
        </Button>
      </div>

      {/* Dialog Criar Role */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Role</DialogTitle>
            <DialogDescription>
              Defina nome e descrição do novo perfil de acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Nome *</Label>
              <Input
                id="create-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: FINANCEIRO"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-description">Descrição</Label>
              <Textarea
                id="create-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ex: Gestão financeira e contábil"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={submitCreate} disabled={saving}>
              {saving ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Role */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Role</DialogTitle>
            <DialogDescription>
              {editingRole && isDefaultRole(editingRole.name)
                ? "Roles padrão não podem ter o nome alterado, mas a descrição pode ser editada."
                : "Atualize nome e descrição da role."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={editingRole !== null && isDefaultRole(editingRole.name)}
              />
              {editingRole && isDefaultRole(editingRole.name) && (
                <p className="text-xs text-muted-foreground">
                  Roles padrão não podem ser renomeadas
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={submitEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Gerenciar Permissões */}
      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gerenciar Permissões</DialogTitle>
            <DialogDescription>
              Role: <strong>{managingRole?.name}</strong>
              {managingRole?.description && (
                <span className="ml-2 text-xs">
                  ({managingRole.description})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Campo de Busca */}
          <div className="py-2">
            <Input
              placeholder="Buscar permissões..."
              value={permissionSearch}
              onChange={(e) => setPermissionSearch(e.target.value)}
              className="w-full"
              disabled={loadingPermissions}
            />
          </div>

          {loadingPermissions ? (
            <div className="py-8 text-center text-muted-foreground">
              Carregando permissões...
            </div>
          ) : allPermissions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma permissão encontrada no sistema.
            </div>
          ) : filteredPermissions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma permissão encontrada para &quot;{permissionSearch}&quot;
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2">
              {groupedPermissions.map(({ module, permissions }) => (
                <div key={module} className="space-y-2">
                  <div className="flex items-center gap-2 sticky top-0 bg-background py-1">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-primary">
                      {module}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {permissions.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {permissions.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedPermissionIds.includes(perm.id)}
                          onCheckedChange={() => togglePermission(perm.id)}
                          disabled={savingPermissions}
                        />
                        <div className="leading-tight min-w-0">
                          <div className="font-medium font-mono text-sm truncate">
                            {perm.slug}
                          </div>
                          {perm.description && (
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {perm.description}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-muted-foreground">
                {selectedPermissionIds.length} de {allPermissions.length} permissão(ões) selecionada(s)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPermissionsOpen(false)}
                  disabled={savingPermissions}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={submitPermissions}
                  disabled={savingPermissions || loadingPermissions}
                >
                  {savingPermissions ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabela de Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Roles Disponíveis</CardTitle>
          <CardDescription>
            {roles.length} role(s) configurada(s) no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhuma role encontrada
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.description || "—"}
                    </TableCell>
                    <TableCell>
                      {isDefaultRole(role.name) ? (
                        <Badge variant="secondary">Padrão</Badge>
                      ) : (
                        <Badge variant="outline">Customizada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(role)}
                          title="Editar role"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPermissions(role)}
                          title="Gerenciar permissões"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        {!isDefaultRole(role.name) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRole(role)}
                            title="Excluir role"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
