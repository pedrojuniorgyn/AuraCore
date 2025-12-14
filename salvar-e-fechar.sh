#!/bin/bash

# Script de Salvamento Rápido
# Uso: bash salvar-e-fechar.sh

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                                                                    ║"
echo "║           🛡️  SALVAMENTO SEGURO - AURA CORE                       ║"
echo "║                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Ir para o diretório do projeto
cd /Users/pedrolemes/aura_core

echo "📍 Diretório: $(pwd)"
echo ""

# 1. Ver status
echo "📊 1/4 - Verificando status do Git..."
git status --short
echo ""

# 2. Adicionar tudo
echo "➕ 2/4 - Adicionando arquivos modificados..."
git add -A
echo "   ✅ Arquivos adicionados"
echo ""

# 3. Commit local
echo "💾 3/4 - Criando commit local..."
git commit -m "fix: Corrigir Agent Review issues + salvamento $(date '+%d/%m/%Y %H:%M')"
echo ""

# 4. Ver último commit
echo "📝 4/4 - Verificando último commit..."
git log -1 --oneline
echo ""

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                                                                    ║"
echo "║              ✅ TUDO SALVO COM SUCESSO!                           ║"
echo "║                                                                    ║"
echo "║  Você pode fechar o Cursor com segurança agora.                   ║"
echo "║                                                                    ║"
echo "║  Comandos para fechar:                                            ║"
echo "║  1. Parar servidor: Ctrl + C (no terminal npm run dev)            ║"
echo "║  2. Fechar Cursor: Cmd + Q (Mac) ou Alt + F4 (Windows)            ║"
echo "║                                                                    ║"
echo "║  💡 Para enviar ao GitHub depois:                                 ║"
echo "║     git push origin main                                          ║"
echo "║                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""




