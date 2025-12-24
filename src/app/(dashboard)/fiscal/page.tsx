import { redirect } from "next/navigation";

export default function FiscalRootRedirectPage() {
  // O breadcrumb gera link intermediário "/fiscal" para a rota "/fiscal/documentos".
  // Mantemos um redirect para evitar 404 no console e melhorar UX.
  redirect("/fiscal/documentos");
}

