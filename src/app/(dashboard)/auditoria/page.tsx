import Link from "next/link";
import { redirect } from "next/navigation";

function getAuditAppUrl(): string {
  const raw = process.env.AUDIT_APP_URL ?? process.env.NEXT_PUBLIC_AUDIT_APP_URL ?? "";
  const url = raw.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) return "";
  return url;
}

export default function AuditoriaPage() {
  const url = getAuditAppUrl();
  if (url) {
    redirect(url);
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Auditoria</h1>
      <p className="text-sm text-muted-foreground">
        O módulo de Auditoria está configurado como um app separado. Para habilitar o redirecionamento automático,
        defina a variável <code className="font-mono">AUDIT_APP_URL</code> no deploy (ex.: URL do seu audit-tcl).
      </p>
      <div className="text-sm">
        <Link className="underline" href="/configuracoes">
          Voltar para Configurações
        </Link>
      </div>
    </div>
  );
}

