"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Shield, Edit, Trash2 } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  roles: { id: number; name: string }[];
}

export default function UsersManagementPage() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

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
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Convidar Usuário
        </Button>
      </div>

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
                <TableHead>Roles</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "—"}</TableCell>
                    <TableCell>{user.email}</TableCell>
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
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
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

      <Card>
        <CardHeader>
          <CardTitle>Roles Disponíveis</CardTitle>
          <CardDescription>
            Perfis de acesso configurados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" />
                Administrador
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Acesso total ao sistema
              </p>
              <Badge className="mt-2" variant="destructive">Admin</Badge>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Gerente
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Gestão operacional e financeira
              </p>
              <Badge className="mt-2" variant="default">Manager</Badge>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                Operador TMS
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Gestão de viagens e cargas
              </p>
              <Badge className="mt-2" variant="secondary">Operator</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


