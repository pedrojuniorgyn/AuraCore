# agents/Makefile
# Comandos de desenvolvimento e deploy

.PHONY: help install dev test lint build push deploy logs shell clean

# Variáveis
REGISTRY ?= ghcr.io/pedrojuniorgyn
IMAGE_NAME ?= auracore-agents
VERSION ?= $(shell git describe --tags --always 2>/dev/null || echo 'latest')

help:
	@echo "AuraCore Agents - Comandos disponíveis:"
	@echo ""
	@echo "  make install    - Instalar dependências"
	@echo "  make dev        - Iniciar em modo desenvolvimento"
	@echo "  make test       - Executar testes"
	@echo "  make lint       - Executar linters"
	@echo "  make build      - Build da imagem Docker"
	@echo "  make push       - Push para registry"
	@echo "  make deploy     - Deploy para Kubernetes"
	@echo "  make logs       - Ver logs do container"
	@echo "  make shell      - Abrir shell no container"
	@echo "  make clean      - Limpar containers e imagens"
	@echo ""

install:
	pip install poetry
	poetry install

dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

test:
	pytest tests/ -v --cov=src --cov-report=html

lint:
	ruff check src/
	mypy src/ || true

build:
	docker build -t $(REGISTRY)/$(IMAGE_NAME):$(VERSION) -t $(REGISTRY)/$(IMAGE_NAME):latest .

push: build
	docker push $(REGISTRY)/$(IMAGE_NAME):$(VERSION)
	docker push $(REGISTRY)/$(IMAGE_NAME):latest

deploy:
	./scripts/deploy.sh deploy

rollback:
	./scripts/deploy.sh rollback

logs:
	kubectl logs -f -l app=auracore-agents -n auracore --tail=100

shell:
	kubectl exec -it deployment/auracore-agents -n auracore -- /bin/bash

clean:
	docker-compose down -v
	docker system prune -f
