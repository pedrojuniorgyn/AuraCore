/**
 * Swagger UI Page
 *
 * Página de documentação interativa da API usando Swagger UI.
 * Acesse: http://localhost:3000/docs
 */

'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SwaggerUI url="/api/docs" />
    </div>
  );
}
