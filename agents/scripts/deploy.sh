#!/bin/bash
# agents/scripts/deploy.sh
# Script de deploy para produção

set -euo pipefail

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variáveis
REGISTRY="${DOCKER_REGISTRY:-ghcr.io/pedrojuniorgyn}"
IMAGE_NAME="auracore-agents"
VERSION="${VERSION:-$(git describe --tags --always 2>/dev/null || echo 'latest')}"
NAMESPACE="${NAMESPACE:-auracore}"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Build
build() {
    log_info "Building Docker image..."
    docker build \
        --tag "${REGISTRY}/${IMAGE_NAME}:${VERSION}" \
        --tag "${REGISTRY}/${IMAGE_NAME}:latest" \
        --build-arg VERSION="${VERSION}" \
        --file Dockerfile \
        .
    log_info "Build completed: ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
}

# Push
push() {
    log_info "Pushing to registry..."
    docker push "${REGISTRY}/${IMAGE_NAME}:${VERSION}"
    docker push "${REGISTRY}/${IMAGE_NAME}:latest"
    log_info "Push completed"
}

# Deploy to Kubernetes
deploy_k8s() {
    log_info "Deploying to Kubernetes..."
    
    # Aplicar namespace primeiro
    kubectl apply -f k8s/namespace.yaml
    
    # Aplicar outros manifests
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/serviceaccount.yaml
    kubectl apply -f k8s/service.yaml
    kubectl apply -f k8s/ingress.yaml
    kubectl apply -f k8s/hpa.yaml
    kubectl apply -f k8s/pdb.yaml
    
    # Substituir versão no deployment e aplicar
    export VERSION
    sed "s|ghcr.io/pedrojuniorgyn/auracore-agents:v2.0.0|${REGISTRY}/${IMAGE_NAME}:${VERSION}|g" k8s/deployment.yaml | kubectl apply -f -
    
    log_info "Waiting for rollout..."
    kubectl rollout status deployment/auracore-agents -n "${NAMESPACE}" --timeout=300s
    
    log_info "Deploy completed"
}

# Rollback
rollback() {
    log_warn "Rolling back deployment..."
    kubectl rollout undo deployment/auracore-agents -n "${NAMESPACE}"
    kubectl rollout status deployment/auracore-agents -n "${NAMESPACE}" --timeout=300s
    log_info "Rollback completed"
}

# Health check
health_check() {
    log_info "Checking health..."
    local endpoint="${API_URL:-http://localhost:8000}/health"
    
    for i in {1..30}; do
        if curl -sf "${endpoint}" > /dev/null; then
            log_info "Health check passed"
            return 0
        fi
        log_warn "Attempt $i/30 - waiting..."
        sleep 10
    done
    
    log_error "Health check failed"
    return 1
}

# Main
main() {
    case "${1:-}" in
        build)
            build
            ;;
        push)
            push
            ;;
        deploy)
            deploy_k8s
            ;;
        rollback)
            rollback
            ;;
        health)
            health_check
            ;;
        all)
            build
            push
            deploy_k8s
            health_check
            ;;
        *)
            echo "Usage: $0 {build|push|deploy|rollback|health|all}"
            exit 1
            ;;
    esac
}

main "$@"
