"use client";

/**
 * Global Error Boundary (Next.js App Router)
 * Evita falha no prerender de /_global-error durante `next build` em alguns ambientes.
 *
 * Referência: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}>
        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Ocorreu um erro inesperado
          </h2>
          <p style={{ color: "#555", marginBottom: 16 }}>
            Tente novamente. Se o problema persistir, entre em contato com o suporte.
          </p>

          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>

          {/* Informação técnica (útil para suporte) */}
          <pre
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              background: "#f6f6f6",
              overflowX: "auto",
              fontSize: 12,
            }}
          >
            {error?.message}
            {error?.digest ? `\nDigest: ${error.digest}` : ""}
          </pre>
        </div>
      </body>
    </html>
  );
}


