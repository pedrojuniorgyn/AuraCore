/**
 * Corrige os últimos 3 grids sem tema escuro
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const files = [
  'src/app/(dashboard)/comercial/tabelas-frete/page.tsx',
  'src/app/(dashboard)/frota/veiculos/page.tsx',
  'src/app/(dashboard)/frota/motoristas/page.tsx',
];

console.log('🌙 CORRIGINDO ÚLTIMOS 3 GRIDS...\n');

for (const file of files) {
  const filePath = join(__dirname, '..', file);
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Encontra o padrão: <Card ...> <CardHeader> ... </CardHeader> <CardContent className="p-0">
    // e substitui por: <div className="space-y-4 mb-4"> ... </div> + dark theme container
    
    // Padrão 1: Substituir Card por div simples
    if (content.includes('<Card className')) {
      content = content.replace(
        /<Card className="[^"]*">/g,
        '<div>'
      );
      content = content.replace(
        /<Card>/g,
        '<div>'
      );
      modified = true;
    }
    
    // Padrão 2: Substituir CardHeader/CardTitle por div/h2
    if (content.includes('<CardHeader>')) {
      content = content.replace(
        /<CardHeader>/g,
        '<div className="space-y-4 mb-4">'
      );
      content = content.replace(
        /<\/CardHeader>/g,
        '</div>'
      );
      content = content.replace(
        /<CardTitle([^>]*)>/g,
        '<h2$1>'
      );
      content = content.replace(
        /<\/CardTitle>/g,
        '</h2>'
      );
      content = content.replace(
        /<CardDescription([^>]*)>/g,
        '<p$1 className="text-sm text-slate-400">'
      );
      content = content.replace(
        /<\/CardDescription>/g,
        '</p>'
      );
      modified = true;
    }
    
    // Padrão 3: Substituir CardContent por dark theme container
    if (content.includes('<CardContent className="p-0">')) {
      content = content.replace(
        /<CardContent className="p-0">\s*<div/g,
        '<div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">\n            <div'
      );
      modified = true;
    }
    
    // Padrão 4: Adicionar ag-theme-quartz-dark nas divs do grid
    content = content.replace(
      /(<div[^>]*style=\{[^}]*height[^}]*\}[^>]*)>/g,
      (match) => {
        if (!match.includes('ag-theme-quartz-dark') && !match.includes('className')) {
          return match.slice(0, -1) + ' className="ag-theme-quartz-dark">';
        } else if (!match.includes('ag-theme-quartz-dark') && match.includes('className')) {
          return match.replace(
            /className="([^"]*)"/,
            'className="$1 ag-theme-quartz-dark"'
          );
        }
        return match;
      }
    );
    
    // Padrão 5: Fechar divs corretamente
    content = content.replace(
      /<\/CardContent>\s*<\/Card>/g,
      '</div>\n          </div>'
    );
    
    // Remove imports não usados
    if (!content.includes('<Card')) {
      content = content.replace(
        /import\s*\{[^}]*Card[^}]*\}\s*from\s*["']@\/components\/ui\/card["'];?\s*/g,
        ''
      );
    }
    
    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ⏭️  ${file}`);
    }
    
  } catch (error: any) {
    console.error(`  ❌ ${file}: ${error.message}`);
  }
}

console.log('\n✅ Concluído!\n');











