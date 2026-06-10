---
description: Project overview, stack, commands. Read for any task in this project.
alwaysApply: true
---

# CSC Discovery — Project

## Overview

CSC Discovery is a federated digital pathology image search portal built on top of
BigPicture (bp.nbis.se). Researchers search for pathology image datasets using
structured filters and request access via REMS.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + TypeScript + Pinia + Vue Router + TanStack Vue Query + Vite |
| UI components | `@cscfi/csc-ui` (web components) + custom Vue components |
| Backend | Python 3 / FastAPI — separate repo, managed by others |
| Search | OpenSearch (Elasticsearch fork — nearly identical API) |
| Auth | LifeScience AAI — cookie-based, backend handles OIDC flow |
| Hosting | CSC Rahti (OpenShift) |
| Testing | Vitest |
| Linting | ESLint + Prettier |
| Package manager | pnpm |

## Commands

```bash
pnpm dev            # dev server
pnpm build          # production build
pnpm type-check     # TypeScript
pnpm test           # vitest
pnpm test:watch     # vitest watch mode
pnpm lint           # Run all linters
pnpm lint:oxlint    # Run OXLint
pnpm lint:eslint    # Run ESLint
pnpm lint:ci        # Run linters in CI mode
pnpm lint:oxlint:ci # Run OXLint in CI mode
pnpm lint:eslint:ci # Run ESLint in CI mode
pnpm format         # Format code with Prettier
pnpm format:ci      # Check code format with Prettier in CI mode
```

## Project Structure

```
src/
  components/
    dynamic/        # OntologyPicker, RangePicker (custom)
    ui/             # wrappers around c-* components
  composables/      # useSearch, useAuth
  directives/       # vControl.ts
  stores/           # Pinia: searchStore, authStore
  services/         # API layer
  types/            # TypeScript types (Beacon V2, FilteringTerm etc.)
  router/           # Vue Router + auth guards
```