"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { UserPlus, Shield, Edit, Trash2, KeyRound } from "lucide-react";
import { AdminAIWidget } from "@/components/admin";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  roles: { id: number; name: string }[];
  googleLinked?: boolean;
  hasPassword?: boolean;
}

interface RoleOption {
  id: number;
  name: string;
  description: string | null;
}

interface BranchOption {
  id: number;
  name: string;
  tradeName: string;
  document: string;
}

export default function UsersManagementPage() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState<string>("");
  const [inviteBranchIds, setInviteBranchIds] = useState<number[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [inviting, setInviting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRoleIds, setEditRoleIds] = useState<number[]>([]);
  const [editBranchIds, setEditBranchIds] = useState<number[]>([]);
  const [savingAccess, setSavingAccess] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadInviteData = useCallback(async () => {
    try {
      const [rolesRes, branchesRes] = await Promise.all([
        fetch("/api/admin/roles", { credentials: "include" }),
        fetch("/api/branches", { credentials: "include" }),
      ]);

      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(data.data || []);
      }

      if (branchesRes.ok) {
        const data = await branchesRes.json();
        setBranches(data.data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do convite:", error);
    }
  }, []); // Empty deps: setRoles e setBranches são estáveis

  useEffect(() => {
    fetchUsers();
    // Carregar roles ao montar para exibir na seção "Roles Disponíveis"
    // Também carrega branches para o modal de convite
    loadInviteData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPassword = (u: User) => {
    setPasswordUser(u);
    setNewPassword("");
    setPasswordOpen(true);
    setSavingPassword(false);
  };

  const submitPasswordUpdate = async () => {
    if (!passwordUser) return;
    if (!newPassword || newPassword.length < 8) {
      toast.error("Senha inválida", { description: "A senha deve ter no mínimo 8 caracteres." });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${passwordUser.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao definir senha");

      toast.success("Senha definida");
      setPasswordOpen(false);
      setPasswordUser(null);
      setNewPassword("");
      await fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao definir senha", { description: errorMessage });
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleBranch = (branchId: number) => {
    setInviteBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  const toggleEditBranch = (branchId: number) => {
    setEditBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  const toggleEditRole = (roleId: number) => {
    setEditRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const openEdit = async (u: User) => {
    setEditingUser(u);
    setEditOpen(true);
    setSavingAccess(false);

    try {
      // garante opções carregadas
      if (roles.length === 0 || branches.length === 0) {
        await loadInviteData();
      }

      const res = await fetch(`/api/admin/users/${u.id}/access`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao carregar acessos");

      setEditRoleIds(data.data.roleIds || []);
      setEditBranchIds(data.data.branchIds || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao carregar acessos", { description: errorMessage });
    }
  };

  const submitAccessUpdate = async () => {
    if (!editingUser) return;
    if (editRoleIds.length === 0) {
      toast.error("Selecione ao menos 1 role");
      return;
    }

    setSavingAccess(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          roleIds: editRoleIds,
          branchIds: editBranchIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao atualizar acessos");

      toast.success("Acessos atualizados");
      setEditOpen(false);
      setEditingUser(null);
      await fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao atualizar acessos", { description: errorMessage });
    } finally {
      setSavingAccess(false);
    }
  };

  const submitInvite = async () => {
    if (!inviteEmail || !inviteRoleId) {
      toast.error("Preencha email e role");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || undefined,
          roleId: Number(inviteRoleId),
          branchIds: inviteBranchIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Falha ao convidar usuário");
      }

      toast.success("Usuário convidado", {
        description: "Ele já pode logar com Google Workspace (email corporativo).",
      });

      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRoleId("");
      setInviteBranchIds([]);
      await fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao convidar usuário", { description: errorMessage });
    } finally {
      setInviting(false);
    }
  };

  const deleteUser = async (u: User) => {
    if (!u?.id) return;
    if (!u.email) {
      toast.error("Não é possível excluir", { description: "Usuário sem email." });
      return;
    }

    const ok = confirm(
      `Excluir o usuário?\n\n` +
        `Email: ${u.email}\n` +
        `Nome: ${u.name || "—"}\n\n` +
        `Essa ação remove acessos (roles/filiais) e revoga sessões.`
    );
    if (!ok) return;

    setDeletingUserId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Falha ao excluir usuário");
      }
      toast.success("Usuário excluído");
      await fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao excluir usuário", { description: errorMessage });
    } finally {
      setDeletingUserId(null);
    }
  };

  if (permissionsLoading || loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!hasPermission("admin.users.manage")) {
    return (
      <div className="p-6">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Acesso Negado
            </CardTitle>
            <CardDescription>
              Você não tem permissão para acessar o gerenciamento de usuários.
              <br />
              <strong>Permissão necessária:</strong> <code>admin.users.manage</code>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
            👥 Gerenciamento de Usuários
          </h1>
          <p className="text-slate-400">
            Controle de acesso e permissões (RBAC)
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Convidar Usuário
        </Button>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Convidar usuário (Google Workspace)</DialogTitle>
            <DialogDescription>
              Modelo A: o colaborador só consegue logar com Google se o e-mail já estiver pré-cadastrado aqui.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="inviteEmail">Email *</Label>
              <Input
                id="inviteEmail"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colaborador@suaempresa.com.br"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inviteName">Nome (opcional)</Label>
              <Input
                id="inviteName"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Nome do colaborador"
              />
            </div>

            <div className="grid gap-2">
              <Label>Role *</Label>
              <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Dica: para admins, selecione o role <code>ADMIN</code>.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Filiais permitidas</Label>
              {branches.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma filial encontrada.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {branches.map((b) => (
                    <label
                      key={b.id}
                      className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30"
                    >
                      <Checkbox
                        checked={inviteBranchIds.includes(b.id)}
                        onCheckedChange={() => toggleBranch(b.id)}
                      />
                      <div className="leading-tight">
                        <div className="font-medium">{b.tradeName || b.name}</div>
                        <div className="text-xs text-muted-foreground">{b.document}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Se não selecionar filiais, o usuário pode ficar sem acesso a telas que exigem Data Scoping.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
              Cancelar
            </Button>
            <Button onClick={submitInvite} disabled={inviting}>
              {inviting ? "Convidando..." : "Convidar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Ativos</CardTitle>
          <CardDescription>
            {users.length} usuário(s) no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "—"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.googleLinked || user.hasPassword ? (
                        <Badge variant="secondary">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Pendente (1º login)</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.length === 0 ? (
                          <Badge variant="outline">Sem role</Badge>
                        ) : (
                          user.roles.map((role) => (
                            <Badge key={role.id} variant="secondary">
                              {role.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPassword(user)}
                          title="Definir senha (login por email)"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteUser(user)}
                          disabled={deletingUserId === user.id}
                          title="Excluir usuário"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Definir senha</DialogTitle>
            <DialogDescription>
              Isto habilita login por <strong>Email/Senha</strong> para o usuário (independente do Google Workspace).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-md border p-3">
              <div className="text-sm font-medium">{passwordUser?.name || "—"}</div>
              <div className="text-xs text-muted-foreground">{passwordUser?.email}</div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="newPassword">Nova senha *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
              <p className="text-xs text-muted-foreground">
                Dica: após definir senha, o status passa a <code>Ativo</code> mesmo sem Google vinculado.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)} disabled={savingPassword}>
              Cancelar
            </Button>
            <Button onClick={submitPasswordUpdate} disabled={savingPassword}>
              {savingPassword ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Editar acessos</DialogTitle>
            <DialogDescription>
              Ajuste roles e filiais permitidas do usuário selecionado.
            </DialogDescription>
          </DialogHeader>

          {!editingUser ? (
            <div className="text-sm text-muted-foreground">Nenhum usuário selecionado.</div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-md border p-3">
                <div className="text-sm font-medium">{editingUser.name || "—"}</div>
                <div className="text-xs text-muted-foreground">{editingUser.email}</div>
              </div>

              <div className="grid gap-2">
                <Label>Roles *</Label>
                {roles.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Carregando roles...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {roles.map((r) => (
                      <label
                        key={r.id}
                        className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30"
                      >
                        <Checkbox
                          checked={editRoleIds.includes(r.id)}
                          onCheckedChange={() => toggleEditRole(r.id)}
                        />
                        <div className="leading-tight">
                          <div className="font-medium">{r.name}</div>
                          {r.description ? (
                            <div className="text-xs text-muted-foreground">{r.description}</div>
                          ) : null}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Filiais permitidas</Label>
                {branches.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Carregando filiais...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {branches.map((b) => (
                      <label
                        key={b.id}
                        className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30"
                      >
                        <Checkbox
                          checked={editBranchIds.includes(b.id)}
                          onCheckedChange={() => toggleEditBranch(b.id)}
                        />
                        <div className="leading-tight">
                          <div className="font-medium">{b.tradeName || b.name}</div>
                          <div className="text-xs text-muted-foreground">{b.document}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingAccess}>
              Fechar
            </Button>
            <Button onClick={submitAccessUpdate} disabled={savingAccess || !editingUser}>
              {savingAccess ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Roles Disponíveis</CardTitle>
          <CardDescription>
            Perfis de acesso configurados no sistema ({roles.length} role
            {roles.length !== 1 ? "s" : ""})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Carregando roles...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {roles.map((role) => (
                <div key={role.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {role.name}
                  </h3>
                  {role.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {role.description}
                    </p>
                  )}
                  <Badge className="mt-2" variant="secondary">
                    {role.name}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* AI Assistant Widget */}
      <AdminAIWidget screen="usuarios" />
    </div>
  );
}
