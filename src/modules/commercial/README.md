# Commercial Module

## Overview
Gateway module for commercial operations. Currently provides PDF generation for proposals.

## Architecture
```
commercial/
├── domain/
│   └── ports/
│       └── output/
│           └── IProposalPdfGateway.ts
└── infrastructure/
    ├── adapters/
    │   └── ProposalPdfAdapter.ts
    └── di/
        ├── CommercialModule.ts
        ├── tokens.ts
        └── index.ts
```

## DDD Patterns
- **Output Port**: IProposalPdfGateway
- **Adapter**: ProposalPdfAdapter (wraps legacy proposal-pdf-generator)
- **DI Token**: COMMERCIAL_TOKENS.ProposalPdfGateway

## Future Evolution
To evolve into a full DDD module, add:
- domain/entities/ (Proposal, Quote, FreightTable)
- domain/value-objects/ (ProposalStatus, QuoteValidity)
- application/commands/ (CreateProposal, ApproveQuote)
- application/queries/ (ListProposals, GetQuoteById)
- infrastructure/persistence/ (DrizzleProposalRepository)

## Status: E9 Fase 2 (Gateway Only)
