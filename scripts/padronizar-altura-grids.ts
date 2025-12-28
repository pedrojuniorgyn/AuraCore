import * as fs from 'fs';
import * as path from 'path';

const files = [
  './src/app/(dashboard)/cadastros/produtos/page.tsx',
  './src/app/(dashboard)/frota/motoristas/page.tsx',
  './src/app/(dashboard)/financeiro/plano-contas/page.tsx',
  './src/app/(dashboard)/comercial/tabelas-frete/page.tsx',
  './src/app/(dashboard)/financeiro/centros-custo/page.tsx',
  './src/app/(dashboard)/comercial/cotacoes/page.tsx',
  './src/app/(dashboard)/frota/veiculos/page.tsx',
  './src/app/(dashboard)/tms/ocorrencias/page.tsx',
  './src/app/(dashboard)/gerencial/dre/page.tsx',
  './src/app/(dashboard)/gerencial/plano-contas/page.tsx',
  './src/app/(dashboard)/tms/repositorio-cargas/page.tsx',
  './src/app/(dashboard)/gerencial/centros-custo-3d/page.tsx',
  './src/app/(dashboard)/financeiro/radar-dda/page.tsx',
  './src/app/(dashboard)/fiscal/creditos-tributarios/page.tsx',
  './src/app/(dashboard)/operacional/margem-cte/page.tsx',
  './src/app/(dashboard)/financeiro/contas-receber/page.tsx',
];

const targetHeight = "calc(100vh - 300px)";

let totalFixed = 0;

files.forEach((filePath) => {
  const fullPath = path.resolve(filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️  ${filePath} não encontrado`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  // Padrões para substituir
  const patterns = [
    // height: 600, height: 500, etc
    /height:\s*600/g,
    /height:\s*550/g,
    /height:\s*500/g,
    /height:\s*450/g,
    
    // height: '600px', height: "600px"
    /height:\s*['"]600px['"]/g,
    /height:\s*['"]550px['"]/g,
    /height:\s*['"]500px['"]/g,
    
    // style={{ height: 600 }}
    /\{\s*height:\s*600\s*\}/g,
    /\{\s*height:\s*550\s*\}/g,
    /\{\s*height:\s*500\s*\}/g,
  ];
  
  // Substituir todos os padrões por targetHeight
  patterns.forEach((pattern) => {
    content = content.replace(pattern, `height: "${targetHeight}"`);
  });
  
  // Padrão especial para style={{ height: 600, ... }}
  content = content.replace(
    /style=\{\{\s*height:\s*(600|550|500|450),/g,
    `style={{ height: "${targetHeight}",`
  );
  
  // Se o conteúdo mudou, salva o arquivo
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`  ✅ ${path.basename(filePath)}`);
    totalFixed++;
  } else {
    console.log(`  ⏭️  ${path.basename(filePath)} (já padronizado)`);
  }
});

console.log(`\n✅ ${totalFixed} arquivos atualizados!`);
console.log(`📊 Altura padrão: ${targetHeight}\n`);















