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
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    fetchPermissions();
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
   * Submete edição de permissão existente (apenas description)
   */
  const submitEdit = async () => {
    if (!editingPermission) return;

    const trimmedDescription = formDescription.trim();

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/permissions/${editingPermission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          description: trimmedDescription || null,
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
   * Agrupa permissões por prefixo (módulo)
   */
  const getModuleFromSlug = (slug: string): string => {
    const parts = slug.split(".");
    return parts[0] || "outros";
  };

  /**
   * Conta permissões por módulo
   */
  const permissionsByModule = permissions.reduce(
    (acc, perm) => {
      const moduleName = getModuleFromSlug(perm.slug);
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
              Defina o slug e descrição da nova permissão.
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
              O slug é imutável. Apenas a descrição pode ser alterada.
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
          <CardTitle>Permissões Disponíveis</CardTitle>
          <CardDescription>
            {permissions.length} permissão(ões) configurada(s) no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhuma permissão encontrada
                  </TableCell>
                </TableRow>
              ) : (
                permissions.map((perm) => (
                  <TableRow key={perm.id}>
                    <TableCell className="font-mono text-sm">
                      {perm.slug}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {perm.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {getModuleFromSlug(perm.slug)}
                      </Badge>
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
