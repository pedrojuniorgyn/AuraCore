import { redirect } from "next/navigation";

export default function EntradaNotasRedirectPage() {
  // Compat: rota antiga usada em links/atalhos/notificações.
  redirect("/fiscal/documentos");
}

