/**
 * Generate PWA Icons Script
 * Gera todos os tamanhos de ícones PWA a partir de um ícone fonte
 * 
 * Uso: node scripts/generate-pwa-icons.js
 * 
 * Requer: sharp (npm install --save-dev sharp)
 * Input: public/icon-source.png (512x512)
 * Output: public/icons/icon-{size}.png
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// Verificar se sharp está instalado
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('❌ Sharp não está instalado!');
  console.error('Execute: npm install --save-dev sharp');
  process.exit(1);
}

// Configuração
const SOURCE_ICON = path.join(__dirname, '../public/icon-source.png');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Criar pasta de output
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`📁 Pasta criada: ${OUTPUT_DIR}`);
}

// Verificar se ícone fonte existe
if (!fs.existsSync(SOURCE_ICON)) {
  console.error(`❌ Ícone fonte não encontrado: ${SOURCE_ICON}`);
  console.error('');
  console.error('Crie um ícone fonte em public/icon-source.png (512x512px)');
  console.error('Recomendação: Use https://www.pwabuilder.com/imageGenerator');
  process.exit(1);
}

// Gerar ícones
async function generateIcons() {
  console.log('🎨 Gerando ícones PWA...\n');

  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

    try {
      await sharp(SOURCE_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ ${size}x${size} → ${outputPath}`);
    } catch (error) {
      console.error(`❌ Erro ao gerar ${size}x${size}:`, error.message);
    }
  }

  console.log('\n🎉 Ícones gerados com sucesso!');
  console.log(`📂 Localização: ${OUTPUT_DIR}`);
}

// Executar
generateIcons().catch(console.error);
