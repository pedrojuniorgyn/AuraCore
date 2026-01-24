/**
 * Custom Document para Pages Router
 * Necessário para compatibilidade quando _app.tsx existe
 * 
 * @module pages
 */
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
