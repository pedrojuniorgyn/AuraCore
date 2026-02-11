# Contracts Module

## Overview
Module for analyzing freight contracts using AI (Gemini/Claude). Extracts clauses, parties, values, dates, and identifies risks.

## Architecture
```
contracts/
├── domain/
│   ├── ports/
│   │   ├── input/          # Use case interfaces
│   │   │   ├── IAnalyzeContractUseCase.ts
│   │   │   └── IAnalyzeFreightContractUseCase.ts
│   │   └── output/         # Gateway interfaces (empty - uses Docling from shared)
│   ├── services/           # Domain services (parsing, extraction)
│   │   ├── ClauseExtractor.ts
│   │   ├── ContractParser.ts
│   │   ├── FreightContractAnalyzer.ts
│   │   └── FreightContractParser.ts
│   └── types/              # Domain types
│       ├── contract.types.ts
│       └── freight-contract.types.ts
├── application/
│   └── commands/
│       ├── analyze-contract/
│       └── analyze-freight-contract/
└── infrastructure/
    └── di/
        ├── ContractsModule.ts
        └── tokens.ts
```

## DDD Patterns
- **Domain Services**: Stateless parsing/extraction logic
- **Input Ports**: IAnalyzeContractUseCase, IAnalyzeFreightContractUseCase
- **Result Pattern**: All use cases return Result<Output, string>

## Dependencies
- Docling (document processing) via shared infrastructure
- Gemini (AI analysis) via agent module

## Status: E-Agent-Fase-D5 (Complete)
