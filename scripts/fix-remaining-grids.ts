/**
 * Corrige os 7 arquivos restantes com tema escuro
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const files = [
  'src/app/(dashboard)/configuracoes/filiais/page.tsx',
  'src/app/(dashboard)/cadastros/parceiros/page.tsx',
  'src/app/(dashboard)/cadastros/filiais/page.tsx',
  'src/app/(dashboard)/frota/veiculos/page.tsx',
  'src/app/(dashboard)/frota/motoristas/page.tsx',
  'src/app/(dashboard)/comercial/cotacoes/page.tsx',
  'src/app/(dashboard)/comercial/tabelas-frete/page.tsx',
];

console.log('🌙 CORRIGINDO GRIDS RESTANTES COM TEMA ESCURO...\n');

let count = 0;

for (const file of files) {
  const filePath = join(__dirname, '..', file);
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    
    // Padrão 1: Card com bg-slate-900
    if (content.includes('Card className') && content.includes('bg-slate-900')) {
      // Remove Card e aplica tema escuro
      content = content.replace(
        /<Card className="[^"]*bg-slate-900[^"]*">\s*<CardHeader>/g,
        '<div className="space-y-4 mb-4">\n          <div className="flex items-center justify-between">'
      );
      
      // Remove CardTitle e substitui por h2
      content = content.replace(
        /<CardTitle className="([^"]*)">/g,
        '<h2 className="$1">'
      );
      content = content.replace(/<\/CardTitle>/g, '</h2>');
      
      // Remove CardHeader close e CardContent
      content = content.replace(
        /\s*<\/CardHeader>\s*<CardContent className="p-0">/g,
        '\n          </div>\n        </div>\n\n        <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">'
      );
      
      // Garante ag-theme-quartz-dark
      content = content.replace(
        /<div style=\{[^}]+\}>\s*<AgGridReact/g,
        (match) => {
          if (!match.includes('ag-theme-quartz-dark')) {
            return match.replace(
              /<div style=/,
              '<div className="ag-theme-quartz-dark" style='
            );
          }
          return match;
        }
      );
      
      // Remove </CardContent></Card>
      content = content.replace(
        /\s*<\/CardContent>\s*<\/Card>/g,
        '\n          </div>'
      );
      
      writeFileSync(filePath, content, 'utf-8');
      console.log(`  ✅ ${file}`);
      count++;
    } else {
      console.log(`  ⏭️  ${file} (não encontrou padrão)`);
    }
    
  } catch (error: any) {
    console.error(`  ❌ ${file}: ${error.message}`);
  }
}

console.log(`\n✅ ${count} arquivos corrigidos!\n`);


