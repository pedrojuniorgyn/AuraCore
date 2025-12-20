import { redirect } from "next/navigation";

export default function AuditoriaFindingsRedirect() {
  // Página antiga "Achados" foi renomeada para "Conciliação (Achados)" para espelhar o módulo Financeiro.
  redirect("/auditoria/conciliacao");
}

