"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CommercialAIWidget } from "@/components/commercial";

export default function CRMPage() {
  return (
    <>
      <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent animate-gradient">
            👥 CRM Logístico
          </h1>
          <p className="text-slate-400">Funil de vendas e pipeline comercial</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      {/* Kanban de Funil */}
      <div className="grid grid-cols-5 gap-4">
        {["Prospecção", "Qualificação", "Proposta", "Negociação", "Fechado"].map((stage) => (
          <Card key={stage}>
            <CardHeader>
              <CardTitle className="text-sm">{stage}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">TODO: Kanban cards</p>
            </CardContent>
          </Card>
        ))}
      </div>
      </div>
      
      {/* AI Assistant Widget - FORA do conteúdo principal (FIXED-001) */}
      <CommercialAIWidget screen="crm" />
    </>
  );
}

