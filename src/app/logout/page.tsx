"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { Card } from "@/components/ui/card";

/**
 * Página simples de Logout
 * Redireciona para /login após logout
 */
export default function LogoutPage() {
  useEffect(() => {
    const run = async () => {
      // Importante:
      // - o cookie auracore_branch é independente do NextAuth e pode persistir após logout.
      // - se outro usuário logar no mesmo browser, o middleware pode injetar um x-branch-id obsoleto.
      try {
        await fetch("/api/tenant/branch", { method: "DELETE" });
      } catch {
        // ignore
      }
      try {
        localStorage.removeItem("auracore:current-branch");
      } catch {
        // ignore
      }
      await signOut({ callbackUrl: "/login" });
    };
    void run();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-lg">Fazendo logout...</p>
        </div>
      </Card>
    </div>
  );
}




















