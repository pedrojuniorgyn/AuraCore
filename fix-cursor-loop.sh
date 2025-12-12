#!/bin/bash

echo "🔧 CURSOR - FIX SAVING LOOP"
echo "================================"
echo ""

# Função para mostrar status
status() {
    echo "✓ $1"
}

erro() {
    echo "✗ $1"
}

# 1. Fechar Cursor (se estiver rodando)
echo "📋 Passo 1: Verificando processos do Cursor..."
if pgrep -f cursor > /dev/null; then
    erro "Cursor ainda está em execução!"
    echo "   Por favor, feche o Cursor completamente antes de executar este script."
    echo "   Use: killall -9 cursor"
    exit 1
else
    status "Cursor não está em execução"
fi

echo ""
echo "📋 Passo 2: Limpando cache do workspace..."

# 2. Limpar arquivos de cache do VSCode/Cursor no workspace
CACHE_DIRS=(
    "/workspace/.vscode"
    "/workspace/.cursor"
    "/home/ubuntu/.config/Cursor/User/workspaceStorage"
    "/home/ubuntu/.config/Cursor/Cache"
    "/home/ubuntu/.config/Cursor/CachedData"
    "/home/ubuntu/.config/Cursor/Code Cache"
    "/home/ubuntu/.cursor/projects"
)

for dir in "${CACHE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "   Limpando: $dir"
        rm -rf "$dir"
        status "Removido: $dir"
    fi
done

echo ""
echo "📋 Passo 3: Limpando arquivos temporários do sistema..."

# 3. Limpar arquivos temporários
find /tmp -name "*cursor*" -type f -mtime -1 2>/dev/null | while read file; do
    echo "   Removendo: $file"
    rm -f "$file"
done

find /tmp -name "*vscode*" -type f -mtime -1 2>/dev/null | while read file; do
    echo "   Removendo: $file"
    rm -f "$file"
done

status "Arquivos temporários limpos"

echo ""
echo "📋 Passo 4: Verificando arquivo problemático..."

FILE="/workspace/_documentation/technical/VINCULO_INTELIGENCIA_FINANCEIRA_PCG_DFC.md"
if [ -f "$FILE" ]; then
    SIZE=$(ls -lh "$FILE" | awk '{print $5}')
    PERMS=$(ls -l "$FILE" | awk '{print $1}')
    status "Arquivo existe: $SIZE, $PERMS"
    
    # Verificar se está corrompido
    if file "$FILE" | grep -q "UTF-8"; then
        status "Encoding correto (UTF-8)"
    else
        erro "Encoding problemático"
    fi
else
    erro "Arquivo não encontrado!"
fi

echo ""
echo "📋 Passo 5: Criando backup de segurança..."

BACKUP_DIR="/workspace/backups/cursor-fix-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "$FILE" ]; then
    cp "$FILE" "$BACKUP_DIR/"
    status "Backup criado em: $BACKUP_DIR"
fi

echo ""
echo "📋 Passo 6: Verificando integridade do Git..."

cd /workspace
if git status > /dev/null 2>&1; then
    status "Repositório Git está OK"
    
    # Verificar se há mudanças não commitadas
    if [ -z "$(git status --porcelain)" ]; then
        status "Não há mudanças pendentes no Git"
    else
        echo "⚠️  Há mudanças pendentes no Git:"
        git status --short
    fi
else
    erro "Problema com o repositório Git"
fi

echo ""
echo "================================"
echo "✅ LIMPEZA CONCLUÍDA!"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo "   1. Abra o Cursor novamente"
echo "   2. Abra o arquivo problemático"
echo "   3. Se o problema persistir, execute:"
echo "      git checkout HEAD -- _documentation/technical/VINCULO_INTELIGENCIA_FINANCEIRA_PCG_DFC.md"
echo ""
echo "💡 DICA: Se ainda tiver problemas, delete o arquivo"
echo "   e restaure do backup em: $BACKUP_DIR"
echo ""
