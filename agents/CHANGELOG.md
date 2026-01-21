# Changelog

All notable changes to AuraCore Agents will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-20

### Added

#### Core Features
- 8 specialized AI agents (Fiscal, Financial, Accounting, TMS, WMS, CRM, Fleet, Strategic)
- 32+ tools for agent operations
- Multi-agent orchestration system
- Context-aware conversations with memory

#### Voice Interface
- Speech-to-Text (STT) via Google Cloud
- Text-to-Speech (TTS) via Google Cloud
- Multi-language support (pt-BR, en-US, es-ES)

#### RAG (Retrieval-Augmented Generation)
- Legislation indexing (6 Brazilian laws)
- Semantic search with embeddings
- Citation support with source references

#### Document Processing
- DANFe extraction (Docling integration)
- DACTe extraction
- PDF processing with OCR

#### Security & Authentication
- API Key authentication (ac_live_*, ac_test_*)
- JWT token support
- RBAC with 8 roles and 20+ permissions
- Rate limiting per plan

#### Observability
- Prometheus metrics (12 metrics)
- Grafana dashboards (3 dashboards)
- Alertmanager integration (10 alerts)
- Structured logging (structlog)

#### Integration Hub
- Slack integration
- Microsoft Teams integration
- Email (SMTP/SendGrid)
- Generic webhooks (15+ events)

#### Analytics & Audit
- Usage tracking and statistics
- Cost estimation
- Audit logging (LGPD compliant)
- Hash chain integrity verification

#### Infrastructure
- Docker multi-stage builds
- Docker Compose (dev, staging, prod)
- Kubernetes manifests (deployment, HPA, PDB)
- CI/CD with GitHub Actions
- Health checks (liveness, readiness, startup)

#### Developer Experience
- Python SDK with sync/async support
- CLI tool with all operations
- Comprehensive documentation
- 130+ tests (unit, e2e, integration, load)

### Security
- Non-root container execution (UID 1000)
- Read-only filesystem with specific writable paths
- Resource limits and quotas
- TLS encryption

### Compliance
- LGPD audit logging
- SPED compliance checks
- 5-year data retention

## [1.0.0] - 2025-11-01

### Added
- Initial release
- Basic agent framework
- Fiscal agent with ICMS calculator
