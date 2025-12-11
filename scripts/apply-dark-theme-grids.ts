/**
 * Script para aplicar tema ESCURO em todas as grids
 * Tema do Monitor de Documentos Fiscais
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DARK_THEME_PATTERN = {
  // Container externo
  outerContainer: 'bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl',
  // Container AG Grid
  gridClass: 'ag-theme-quartz-dark',
};

const files = [
  'src/app/(dashboard)/configuracoes/backoffice/page.tsx',
  'src/app/(dashboard)/fiscal/ncm-categorias/page.tsx',
  'src/app/(dashboard)/financeiro/radar-dda/page.tsx',
  'src/app/(dashboard)/fiscal/matriz-tributaria/page.tsx',
  'src/app/(dashboard)/financeiro/contas-pagar/page.tsx',
  'src/app/(dashboard)/fiscal/ciap/page.tsx',
  'src/app/(dashboard)/financeiro/centros-custo/page.tsx',
  'src/app/(dashboard)/fiscal/creditos-tributarios/page.tsx',
  'src/app/(dashboard)/configuracoes/filiais/page.tsx',
  'src/app/(dashboard)/tms/repositorio-cargas/page.tsx',
  'src/app/(dashboard)/operacional/sinistros/page.tsx',
  'src/app/(dashboard)/cadastros/produtos/page.tsx',
  'src/app/(dashboard)/gerencial/plano-contas/page.tsx',
  'src/app/(dashboard)/financeiro/remessas/page.tsx',
  'src/app/(dashboard)/tms/ocorrencias/page.tsx',
  'src/app/(dashboard)/financeiro/intercompany/page.tsx',
  'src/app/(dashboard)/operacional/margem-cte/page.tsx',
  'src/app/(dashboard)/gerencial/centros-custo-3d/page.tsx',
  'src/app/(dashboard)/wms/faturamento/page.tsx',
  'src/app/(dashboard)/financeiro/categorias/page.tsx',
  'src/app/(dashboard)/gerencial/dre/page.tsx',
  'src/app/(dashboard)/financeiro/contas-receber/page.tsx',
  'src/app/(dashboard)/cadastros/parceiros/page.tsx',
  'src/app/(dashboard)/financeiro/plano-contas/page.tsx',
  'src/app/(dashboard)/financeiro/impostos-recuperaveis/page.tsx',
  'src/app/(dashboard)/frota/documentacao/page.tsx',
  'src/app/(dashboard)/rh/motoristas/jornadas/page.tsx',
  'src/app/(dashboard)/sustentabilidade/carbono/page.tsx',
  'src/app/(dashboard)/cadastros/filiais/page.tsx',
  'src/app/(dashboard)/frota/veiculos/page.tsx',
  'src/app/(dashboard)/frota/motoristas/page.tsx',
  'src/app/(dashboard)/comercial/cotacoes/page.tsx',
  'src/app/(dashboard)/comercial/tabelas-frete/page.tsx',
];

console.log('🌙 APLICANDO TEMA ESCURO EM TODAS AS GRIDS...\n');

let processedCount = 0;
let errorCount = 0;

for (const file of files) {
  const filePath = join(__dirname, '..', file);
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // PADRÃO 1: Remove Card/CardContent wrappers e adiciona tema escuro
    // Procura por: <Card> ... <CardContent className="p-0"> ... <div className="ag-theme-quartz-dark"
    const cardPattern1 = /(<Card>\s*<CardHeader>[\s\S]*?<\/CardHeader>\s*<CardContent className="p-0">)\s*(<div[^>]*className="[^"]*ag-theme-quartz-dark[^"]*"[^>]*>)/g;
    
    if (cardPattern1.test(content)) {
      content = content.replace(
        cardPattern1,
        (match, cardPart, divPart) => {
          // Remove Card/CardContent, mantém CardHeader se existir
          const headerMatch = cardPart.match(/<CardHeader>[\s\S]*?<\/CardHeader>/);
          const header = headerMatch ? headerMatch[0] : '';
          
          // Substitui div por tema escuro
          const newDiv = divPart.replace(
            /className="[^"]*"/,
            `className="${DARK_THEME_PATTERN.gridClass}"`
          );
          
          return `<div className="${DARK_THEME_PATTERN.outerContainer}">\n          ${newDiv}`;
        }
      );
      modified = true;
    }
    
    // PADRÃO 2: Já tem o container correto, só precisa garantir ag-theme-quartz-dark
    const themePattern = /className="[^"]*ag-theme-(?:quartz|alpine)[^"]*"/g;
    if (themePattern.test(content)) {
      content = content.replace(
        themePattern,
        `className="${DARK_THEME_PATTERN.gridClass}"`
      );
      modified = true;
    }
    
    // PADRÃO 3: Garante que container pai tem o gradiente escuro
    const containerPattern = /<div className="[^"]*(?:bg-white|bg-gray-50)[^"]*"[^>]*>\s*<div className="ag-theme-quartz-dark"/g;
    if (containerPattern.test(content)) {
      content = content.replace(
        containerPattern,
        `<div className="${DARK_THEME_PATTERN.outerContainer}">\n          <div className="${DARK_THEME_PATTERN.gridClass}"`
      );
      modified = true;
    }
    
    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`  ✅ ${file}`);
      processedCount++;
    } else {
      console.log(`  ⏭️  ${file} (já está correto ou não precisa mudança)`);
    }
    
  } catch (error: any) {
    console.error(`  ❌ ${file}: ${error.message}`);
    errorCount++;
  }
}

console.log(`\n📊 RESULTADO:`);
console.log(`  ✅ Processados: ${processedCount}`);
console.log(`  ⏭️  Ignorados: ${files.length - processedCount - errorCount}`);
console.log(`  ❌ Erros: ${errorCount}`);
console.log(`\n✅ Tema escuro aplicado com sucesso!\n`);




