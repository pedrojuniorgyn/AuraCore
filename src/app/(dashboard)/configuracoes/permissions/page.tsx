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
import { Plus, Edit, Key, Shield } from "lucide-react";
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

interface Permission {
  id: number;
  slug: string;
  description: string | null;
  module: string | null;
}

interface Role {
  id: number;
  name: string;
}

interface RolePermission {
  roleId: number;
  roleName: string;
  permissionIds: number[];
}

/** Regex para validar slug: lowercase, números, dots, underscores */
const SLUG_REGEX = /^[a-z0-9._]+$/;

export default function PermissionsManagementPage() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para modais
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null
  );

  // Estado do formulário
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formModule, setFormModule] = useState("");
  const [saving, setSaving] = useState(false);

  // Estado para roles e suas permissões
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Map<number, number[]>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Busca lista de permissões do backend
   */
  const fetchPermissions = async () => {
    try {
      const res = await fetch("/api/admin/permissions", {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setPermissions(data.data || []);
      } else {
        console.error("Erro ao carregar permissões:", data?.error);
      }
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Busca roles e suas permissões
   */
  const fetchRolesWithPermissions = async () => {
    try {
      const rolesRes = await fetch("/api/admin/roles", { credentials: "include" });
      if (!rolesRes.ok) return;
      
      const rolesData = await rolesRes.json();
      const rolesArray = rolesData.data || [];
      setRoles(rolesArray);

      // Buscar permissões de cada role em paralelo
      const permMap = new Map<number, number[]>();
      
      await Promise.all(
        rolesArray.map(async (role: Role) => {
          try {
            const res = await fetch(`/api/admin/roles/${role.id}/permissions`, {
              credentials: "include",
            });
            if (res.ok) {
              const data = await res.json();
              const permIds = (data.data?.permissions || []).map((p: Permission) => p.id);
              permMap.set(role.id, permIds);
            }
          } catch {
            // Ignorar erro individual
          }
        })
      );
      
      setRolePermissions(permMap);
    } catch (error) {
      console.error("Erro ao carregar roles:", error);
    }
  };

  /**
   * Retorna as roles que têm uma determinada permissão
   */
  const getRolesForPermission = (permId: number): Role[] => {
    return roles.filter((role) => {
      const perms = rolePermissions.get(role.id) || [];
      return perms.includes(permId);
    });
  };

  useEffect(() => {
    fetchPermissions();
    fetchRolesWithPermissions();
  }, []);

  /**
   * Valida formato do slug
   */
  const isValidSlug = (slug: string): boolean => {
    return SLUG_REGEX.test(slug);
  };

  /**
   * Abre modal de criação
   */
  const openCreate = () => {
    setFormSlug("");
    setFormDescription("");
    setFormModule("");
    setSaving(false);
    setCreateOpen(true);
  };

  /**
   * Abre modal de edição
   */
  const openEdit = (permission: Permission) => {
    setEditingPermission(permission);
    setFormSlug(permission.slug);
    setFormDescription(permission.description || "");
    setFormModule(permission.module || "");
    setSaving(false);
    setEditOpen(true);
  };

  /**
   * Submete criação de nova permissão
   */
  const submitCreate = async () => {
    const trimmedSlug = formSlug.trim().toLowerCase();

    if (!trimmedSlug) {
      toast.error("Slug obrigatório", {
        description: "Informe o slug da permissão",
      });
      return;
    }

    if (!isValidSlug(trimmedSlug)) {
      toast.error("Slug inválido", {
        description: "Use apenas letras minúsculas, números, pontos e underscores",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug: trimmedSlug,
          description: formDescription.trim() || null,
          module: formModule.trim() || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao criar permissão");
      }

      toast.success("Permissão criada com sucesso");
      setCreateOpen(false);
      await fetchPermissions();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao criar permissão", { description: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Submete edição de permissão existente (description e module)
   */
  const submitEdit = async () => {
    if (!editingPermission) return;

    const trimmedDescription = formDescription.trim();
    const trimmedModule = formModule.trim();

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/permissions/${editingPermission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          description: trimmedDescription || null,
          module: trimmedModule || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao editar permissão");
      }

      toast.success("Permissão atualizada com sucesso");
      setEditOpen(false);
      await fetchPermissions();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao editar permissão", { description: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Extrai módulo do slug (fallback se module não definido)
   */
  const getModuleFromSlug = (slug: string): string => {
    const parts = slug.split(".");
    return parts[0] || "outros";
  };

  /**
   * Retorna o módulo de uma permissão
   */
  const getPermissionModule = (perm: Permission): string => {
    return perm.module || getModuleFromSlug(perm.slug);
  };

  /**
   * Filtra permissões pela busca
   */
  const filteredPermissions = permissions.filter((perm) => {
    if (!searchQuery.trim()) return true;
    const search = searchQuery.toLowerCase();
    return (
      perm.slug.toLowerCase().includes(search) ||
      perm.description?.toLowerCase().includes(search) ||
      getPermissionModule(perm).toLowerCase().includes(search)
    );
  });

  /**
   * Conta permissões por módulo
   */
  const permissionsByModule = permissions.reduce(
    (acc, perm) => {
      const moduleName = getPermissionModule(perm);
      acc[moduleName] = (acc[moduleName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

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
              Você não tem permissão para gerenciar permissões.
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Key className="h-8 w-8" />
            Gerenciamento de Permissões
          </h1>
          <p className="text-muted-foreground">
            Permissões granulares do sistema
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Permissão
        </Button>
      </div>

      {/* Resumo por Módulo */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(permissionsByModule)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([moduleName, count]) => (
            <Badge key={moduleName} variant="outline" className="text-xs">
              {moduleName}: {count}
            </Badge>
          ))}
      </div>

      {/* Dialog Criar Permissão */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Permissão</DialogTitle>
            <DialogDescription>
              Defina o slug, módulo e descrição da nova permissão.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-slug">Slug *</Label>
              <Input
                id="create-slug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value.toLowerCase())}
                placeholder="Ex: fiscal.nfe.create"
                autoFocus
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Use letras minúsculas, números, pontos e underscores.
                <br />
                Formato sugerido: <code>modulo.recurso.acao</code>
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-module">Módulo</Label>
              <Input
                id="create-module"
                value={formModule}
                onChange={(e) => setFormModule(e.target.value.toLowerCase())}
                placeholder="Ex: fiscal, tms, financial, admin"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Se não informado, será extraído do slug (primeira parte antes do ponto).
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-description">Descrição</Label>
              <Textarea
                id="create-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ex: Criar notas fiscais eletrônicas"
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

      {/* Dialog Editar Permissão */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Permissão</DialogTitle>
            <DialogDescription>
              O slug é imutável. Módulo e descrição podem ser alterados.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={formSlug}
                disabled
                className="font-mono bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O slug não pode ser alterado após a criação.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-module">Módulo</Label>
              <Input
                id="edit-module"
                value={formModule}
                onChange={(e) => setFormModule(e.target.value.toLowerCase())}
                placeholder="Ex: fiscal, tms, financial, admin"
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                autoFocus
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

      {/* Tabela de Permissões */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Permissões Disponíveis</CardTitle>
              <CardDescription>
                {filteredPermissions.length} de {permissions.length} permissão(ões)
              </CardDescription>
            </div>
            <Input
              placeholder="Buscar permissões..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPermissions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchQuery
                      ? `Nenhuma permissão encontrada para "${searchQuery}"`
                      : "Nenhuma permissão encontrada"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPermissions.map((perm) => {
                  const permRoles = getRolesForPermission(perm.id);
                  return (
                    <TableRow key={perm.id}>
                      <TableCell className="font-mono text-sm">
                        {perm.slug}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {perm.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {getPermissionModule(perm)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {permRoles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            permRoles.slice(0, 3).map((role) => (
                              <Badge key={role.id} variant="outline" className="text-xs">
                                {role.name}
                              </Badge>
                            ))
                          )}
                          {permRoles.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{permRoles.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(perm)}
                          title="Editar permissão"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
