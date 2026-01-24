/**
 * NotFound Page - 404 Error Handler
 * 
 * @module app
 */
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-foreground">
          Página não encontrada
        </h2>
        <p className="mt-2 text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
