#!/bin/bash
# force-rebuild-coolify.sh - Forçar rebuild sem cache no Coolify

echo "🔥 Forçando rebuild completo (sem cache) no Coolify..."
echo ""

# Executar no servidor
ssh root@srv1195982 << 'ENDSSH'
  # Encontrar container atual
  WEB=$(docker ps --filter "name=web-zksk8s0kk08sksgwggkos0gw" --format "{{.Names}}" | head -1)
  
  if [ -z "$WEB" ]; then
    echo "❌ Container web não encontrado!"
    exit 1
  fi
  
  echo "📦 Container atual: $WEB"
  
  # Parar container
  echo "⏸️  Parando container..."
  docker stop $WEB
  
  # Remover container
  echo "🗑️  Removendo container..."
  docker rm $WEB
  
  # Remover imagens antigas (limpeza de cache)
  echo "🧹 Limpando imagens antigas..."
  docker images | grep "zksk8s0kk08sksgwggkos0gw_web" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
  
  # Limpar build cache
  echo "🗑️  Limpando build cache..."
  docker builder prune -f
  
  echo ""
  echo "✅ Limpeza concluída!"
  echo ""
  echo "⚠️  IMPORTANTE: Agora você DEVE fazer um deploy manual pelo painel Coolify:"
  echo "   https://coolify.auracore.cloud"
  echo "   AuraCore → Deployments → Deploy"
  echo ""
  
ENDSSH

echo ""
echo "🎯 Próximos passos:"
echo "1. Acessar: https://coolify.auracore.cloud"
echo "2. AuraCore → Deployments"
echo "3. Clicar 'Deploy' ou 'Redeploy'"
echo "4. Aguardar 3-5 minutos"
echo "5. Validar: curl https://tcl.auracore.cloud/api/admin/users"
