#!/bin/bash

echo "🔧 E3 BATCH 3.2: Substituição direta de error.message inline..."

# Substituir padrões inline diretos
find src/app/api -name "*.ts" -type f -exec sed -i '' \
  -e 's/{ error: error\.message }/{ error: errorMessage }/g' \
  -e 's/{ message: error\.message }/{ message: errorMessage }/g' \
  -e 's/error: error\.message,/error: errorMessage,/g' \
  -e 's/message: error\.message,/message: errorMessage,/g' \
  -e 's/error: error\.message }/error: errorMessage }/g' \
  -e 's/(error\.message)/(errorMessage)/g' \
  -e 's/, error\.message/, errorMessage/g' \
  {} \;

echo "✅ Substituições concluídas"
echo ""
echo "📊 Verificando resultado..."

