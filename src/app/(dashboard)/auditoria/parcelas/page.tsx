import { redirect } from "next/navigation";

export default function AuditoriaParcelasRedirect() {
  // Página antiga "Parcelas" foi subdividida para espelhar o módulo Financeiro:
  // - /auditoria/contas-pagar (débito)
  // - /auditoria/contas-receber (crédito)
  redirect("/auditoria/contas-pagar");
}

