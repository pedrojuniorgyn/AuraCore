/**
 * 🎨 COMPONENTE: PCG NCM SELECTOR
 * 
 * Seletor inteligente de NCM baseado na Conta Gerencial (PCG).
 * 
 * Funcionalidades:
 * - Dropdown de Conta Gerencial (linguagem operacional)
 * - Sugestão automática de NCMs baseada no PCG selecionado
 * - Auto-preenchimento de flags fiscais (Monofásico, ST, Diferimento, etc.)
 * - Badges visuais para match exato vs wildcard
 * 
 * Uso:
 * ```tsx
 * <PcgNcmSelector
 *   pcgId={formData.pcgId}
 *   ncmCode={formData.ncmCode}
 *   onChange={(pcgId, ncmCode, flags) => {
 *     setFormData({ ...formData, pcgId, ncmCode, ...flags });
 *   }}
 * />
 * ```
 */

"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

interface PcgOption {
  id: number;
  code: string;
  name: string;
  category: string | null;
}

interface NcmOption {
  ncmCode: string;
  ncmDescription: string;
  matchType: "EXACT" | "WILDCARD";
  flags: {
    pisCofinsMono: boolean;
    icmsSt: boolean;
    icmsDif: boolean;
    ipiSuspenso: boolean;
    importacao: boolean;
  };
}

interface FiscalFlags {
  pisCofinsMono: boolean;
  icmsSt: boolean;
  icmsDif: boolean;
  ipiSuspenso: boolean;
  importacao: boolean;
}

interface PcgNcmSelectorProps {
  pcgId?: number;
  ncmCode?: string;
  onChange: (pcgId: number | undefined, ncmCode: string | undefined, flags: FiscalFlags | null) => void;
  disabled?: boolean;
  showFlagsCard?: boolean; // Mostrar card de flags (default: true)
}

export function PcgNcmSelector({
  pcgId,
  ncmCode,
  onChange,
  disabled = false,
  showFlagsCard = true,
}: PcgNcmSelectorProps) {
  const [pcgOptions, setPcgOptions] = useState<PcgOption[]>([]);
  const [ncmOptions, setNcmOptions] = useState<NcmOption[]>([]);
  const [selectedFlags, setSelectedFlags] = useState<FiscalFlags | null>(null);
  
  const [loadingPcgs, setLoadingPcgs] = useState(false);
  const [loadingNcms, setLoadingNcms] = useState(false);
  const [loadingFlags, setLoadingFlags] = useState(false);

  // 1. Carrega lista de PCGs ao montar
  useEffect(() => {
    loadPcgs();
  }, []);

  // 2. Quando PCG muda, carrega NCMs sugeridos
  useEffect(() => {
    if (pcgId) {
      loadNcmsByPcg(pcgId);
    } else {
      setNcmOptions([]);
      setSelectedFlags(null);
    }
  }, [pcgId]);

  // 3. Quando NCM muda (manualmente), carrega flags
  useEffect(() => {
    if (ncmCode && ncmCode.length === 8) {
      loadFiscalFlags(ncmCode);
    }
  }, [ncmCode]);

  async function loadPcgs() {
    setLoadingPcgs(true);
    try {
      const res = await fetch("/api/pcg-ncm-rules?list_pcgs=true");
      const data = await res.json();
      if (data.success) {
        setPcgOptions(data.data);
      }
    } catch (error) {
      console.error("Erro ao carregar PCGs:", error);
    } finally {
      setLoadingPcgs(false);
    }
  }

  async function loadNcmsByPcg(pcgId: number) {
    setLoadingNcms(true);
    try {
      const res = await fetch(`/api/pcg-ncm-rules?pcg_id=${pcgId}`);
      const data = await res.json();
      if (data.success) {
        setNcmOptions(data.data);
      }
    } catch (error) {
      console.error("Erro ao carregar NCMs:", error);
    } finally {
      setLoadingNcms(false);
    }
  }

  async function loadFiscalFlags(ncmCode: string) {
    setLoadingFlags(true);
    try {
      const res = await fetch(`/api/pcg-ncm-rules/fiscal-flags?ncm_code=${ncmCode}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        setSelectedFlags(data.data.flags);
        onChange(pcgId, ncmCode, data.data.flags);
      } else {
        // NCM não encontrado
        setSelectedFlags(null);
        onChange(pcgId, ncmCode, null);
      }
    } catch (error) {
      console.error("Erro ao carregar flags fiscais:", error);
      setSelectedFlags(null);
    } finally {
      setLoadingFlags(false);
    }
  }

  function handlePcgChange(value: string) {
    const newPcgId = value === "none" ? undefined : parseInt(value);
    onChange(newPcgId, undefined, null);
    setSelectedFlags(null);
  }

  function handleNcmChange(value: string) {
    const selectedNcm = ncmOptions.find((n) => n.ncmCode === value);
    
    if (selectedNcm) {
      setSelectedFlags(selectedNcm.flags);
      onChange(pcgId, value, selectedNcm.flags);
    } else {
      onChange(pcgId, value, null);
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Seletor de Conta Gerencial (PCG) */}
      <div>
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Conta Gerencial (Categoria Operacional)
        </Label>
        <Select
          value={pcgId?.toString() || "none"}
          onValueChange={handlePcgChange}
          disabled={disabled || loadingPcgs}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder={loadingPcgs ? "Carregando..." : "Selecione a categoria..."} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">Selecione...</span>
            </SelectItem>
            {pcgOptions.map((pcg) => (
              <SelectItem key={pcg.id} value={pcg.id.toString()}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {pcg.code}
                  </span>
                  <span>{pcg.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Selecione a categoria que o almoxarife entende (ex: &quot;Combustível&quot;, &quot;Peças de Reposição&quot;)
        </p>
      </div>

      {/* 2. Seletor de NCM (sugestões inteligentes) */}
      {pcgId && (
        <div>
          <Label className="flex items-center gap-2">
            NCM (Sugestão Inteligente)
            {loadingNcms && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </Label>
          <Select
            value={ncmCode || "none"}
            onValueChange={handleNcmChange}
            disabled={disabled || loadingNcms || ncmOptions.length === 0}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue
                placeholder={
                  loadingNcms
                    ? "Carregando sugestões..."
                    : ncmOptions.length === 0
                    ? "Nenhum NCM configurado para esta categoria"
                    : "Selecione o NCM..."
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Selecione...</span>
              </SelectItem>
              {ncmOptions.map((option) => (
                <SelectItem key={option.ncmCode} value={option.ncmCode}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">
                      {option.ncmCode}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {option.ncmDescription}
                    </span>
                    {option.matchType === "WILDCARD" && (
                      <Badge variant="outline" className="text-xs">
                        Genérico
                      </Badge>
                    )}
                    {option.flags.pisCofinsMono && (
                      <Badge variant="secondary" className="text-xs">
                        Monofásico
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {ncmOptions.length > 0
              ? `${ncmOptions.length} NCM(s) sugeridos para esta categoria`
              : "Configure regras NCM em Configurações → Fiscal → Regras PCG-NCM"}
          </p>
        </div>
      )}

      {/* 3. Card de Flags Fiscais (auto-preenchidas) */}
      {showFlagsCard && selectedFlags && (
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Flags Fiscais (Aplicadas Automaticamente)
            </CardTitle>
            <CardDescription className="text-xs">
              Configurações fiscais definidas para este NCM
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <FlagCheckbox
              checked={selectedFlags.pisCofinsMono}
              label="PIS/COFINS Monofásico"
              description="Combustível com tributação concentrada na refinaria"
            />
            <FlagCheckbox
              checked={selectedFlags.icmsSt}
              label="ICMS Substituição Tributária"
              description="Imposto recolhido antecipadamente pelo fornecedor"
            />
            <FlagCheckbox
              checked={selectedFlags.icmsDif}
              label="ICMS Diferimento"
              description="Postergação do pagamento do ICMS"
            />
            <FlagCheckbox
              checked={selectedFlags.ipiSuspenso}
              label="IPI Suspenso"
              description="Insumo destinado à industrialização"
            />
            <FlagCheckbox
              checked={selectedFlags.importacao}
              label="Item Importado"
              description="Produto importado (DI obrigatória)"
            />
          </CardContent>
        </Card>
      )}

      {/* 4. Aviso se NCM não tem flags */}
      {showFlagsCard && ncmCode && !selectedFlags && !loadingFlags && (
        <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-900/10 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-500">
                  NCM não encontrado nas regras
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure uma regra para este NCM em <strong>Configurações → Fiscal → Regras PCG-NCM</strong> para aplicar flags automaticamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente auxiliar: Checkbox de flag fiscal
function FlagCheckbox({
  checked,
  label,
  description,
}: {
  checked: boolean;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start space-x-2 py-1">
      <Checkbox checked={checked} disabled className="mt-0.5" />
      <div className="flex-1">
        <Label className="text-sm font-normal cursor-default">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {checked && <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />}
    </div>
  );
}
