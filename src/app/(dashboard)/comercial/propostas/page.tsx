"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Plus } from "lucide-react";

interface Proposal {
  id: number;
  proposalNumber: string;
  status: string;
  validityDays: number;
  createdAt: Date;
}

export default function PropostasPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const loadProposals = async () => {
    try {
      const response = await fetch("/api/comercial/proposals");
      const data = await response.json();
      setProposals(data.data || []);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  useEffect(() => {
    // Usar setTimeout para evitar setState síncrono em effect
    const timeoutId = setTimeout(() => {
      loadProposals();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  const downloadPDF = (id: number) => {
    window.open(`/api/comercial/proposals/${id}/pdf`, "_blank");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent animate-gradient">
            📋 Propostas Comerciais
          </h1>
          <p className="text-slate-400">Gerador de propostas PDF</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Proposta
        </Button>
      </div>

      <div className="grid gap-4">
        {proposals.map((proposal) => (
          <Card key={proposal.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{proposal.proposalNumber}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Criada em {new Date(proposal.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge>{proposal.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => downloadPDF(proposal.id)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


