'use client';

/**
 * Componente: FiveWhysForm
 * Formulário de análise 5 Porquês (Metodologia Falconi)
 * 
 * @module strategic/presentation/components
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Lightbulb, Target, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Componente Alert simplificado
function Alert({ children, variant, className }: { 
  children: React.ReactNode; 
  variant?: 'default' | 'destructive';
  className?: string;
}) {
  return (
    <div className={cn(
      'p-4 rounded-lg border',
      variant === 'destructive' 
        ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200' 
        : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200',
      className
    )}>
      {children}
    </div>
  );
}

function AlertTitle({ children }: { children: React.ReactNode }) {
  return <h5 className="font-medium mb-1">{children}</h5>;
}

function AlertDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm">{children}</p>;
}

interface FiveWhysData {
  why1: string;
  why2: string;
  why3?: string;
  why4?: string;
  why5?: string;
  rootCause?: string;
}

interface FiveWhysFormProps {
  anomalyId?: string;
  anomalyTitle: string;
  anomalyDescription?: string;
  onSubmit: (data: FiveWhysData) => Promise<void>;
  onCancel: () => void;
}

export function FiveWhysForm({
  anomalyId,
  anomalyTitle,
  anomalyDescription,
  onSubmit,
  onCancel,
}: FiveWhysFormProps) {
  const [formData, setFormData] = useState<FiveWhysData>({
    why1: '',
    why2: '',
    why3: '',
    why4: '',
    why5: '',
    rootCause: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.why1.trim() || !formData.why2.trim()) {
      setError('Os dois primeiros "porquês" são obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        why1: formData.why1.trim(),
        why2: formData.why2.trim(),
        why3: formData.why3?.trim() || undefined,
        why4: formData.why4?.trim() || undefined,
        why5: formData.why5?.trim() || undefined,
        rootCause: formData.rootCause?.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar análise');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof FiveWhysData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Determinar causa raiz sugerida
  const suggestedRootCause = 
    formData.why5?.trim() || 
    formData.why4?.trim() || 
    formData.why3?.trim() || 
    formData.why2?.trim() || '';

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-500" />
            Análise 5 Porquês
          </CardTitle>
          <CardDescription>
            {anomalyTitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Instrução */}
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Metodologia 5 Porquês</AlertTitle>
            <AlertDescription>
              Pergunte &quot;Por quê?&quot; repetidamente até chegar à causa raiz do problema.
              Geralmente 5 níveis são suficientes para identificar a causa fundamental.
            </AlertDescription>
          </Alert>

          {anomalyDescription && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{anomalyDescription}</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Why 1 */}
          <div className="space-y-2">
            <Label htmlFor="why1" className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
                1
              </span>
              Por quê? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="why1"
              placeholder="Por que o problema ocorreu?"
              value={formData.why1}
              onChange={(e) => updateField('why1', e.target.value)}
              rows={2}
              className={cn(!formData.why1.trim() && 'border-amber-300')}
            />
          </div>

          {/* Why 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="why2" className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
                  2
                </span>
                Por quê? <span className="text-red-500">*</span>
              </Label>
            </div>
            <Textarea
              id="why2"
              placeholder="Por que isso aconteceu (resposta anterior)?"
              value={formData.why2}
              onChange={(e) => updateField('why2', e.target.value)}
              rows={2}
              disabled={!formData.why1.trim()}
              className={cn(!formData.why2.trim() && formData.why1.trim() && 'border-amber-300')}
            />
          </div>

          {/* Why 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="why3" className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-sm font-bold">
                  3
                </span>
                Por quê?
              </Label>
            </div>
            <Textarea
              id="why3"
              placeholder="Continue a investigação..."
              value={formData.why3}
              onChange={(e) => updateField('why3', e.target.value)}
              rows={2}
              disabled={!formData.why2.trim()}
            />
          </div>

          {/* Why 4 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="why4" className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-sm font-bold">
                  4
                </span>
                Por quê?
              </Label>
            </div>
            <Textarea
              id="why4"
              placeholder="Continue a investigação..."
              value={formData.why4}
              onChange={(e) => updateField('why4', e.target.value)}
              rows={2}
              disabled={!formData.why3?.trim()}
            />
          </div>

          {/* Why 5 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="why5" className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-sm font-bold">
                  5
                </span>
                Por quê?
              </Label>
            </div>
            <Textarea
              id="why5"
              placeholder="Continue a investigação..."
              value={formData.why5}
              onChange={(e) => updateField('why5', e.target.value)}
              rows={2}
              disabled={!formData.why4?.trim()}
            />
          </div>

          {/* Causa Raiz */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800 space-y-2">
            <Label htmlFor="rootCause" className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-600" />
              Causa Raiz Identificada
            </Label>
            <Textarea
              id="rootCause"
              placeholder={suggestedRootCause || 'Resumo da causa raiz identificada...'}
              value={formData.rootCause}
              onChange={(e) => updateField('rootCause', e.target.value)}
              rows={2}
            />
            {suggestedRootCause && !formData.rootCause && (
              <p className="text-xs text-muted-foreground">
                Sugestão baseada na última resposta: &quot;{suggestedRootCause.substring(0, 50)}...&quot;
              </p>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.why1.trim() || !formData.why2.trim()}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Análise
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
