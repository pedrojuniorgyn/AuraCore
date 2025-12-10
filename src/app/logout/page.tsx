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
    signOut({ callbackUrl: "/login" });
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










