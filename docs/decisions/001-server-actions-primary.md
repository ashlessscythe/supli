# ADR-001: Server Actions as Primary Backend Interface

## Status
Accepted

## Context
The application has duplicate logic in REST API routes (`src/app/api/*`) and server actions (`src/lib/actions/*`). The UI uses server actions exclusively.

## Decision
Server actions are the primary interface for UI mutations. API routes will become thin wrappers over shared services or be removed if unused.

## Consequences
- Single source of truth for business logic in service layer
- API routes remain available for future external integrations
- Reduced maintenance burden from duplicated Zod schemas and audit logging
